import { create } from 'zustand';
import { createEngineSlice, EngineSlice } from './engineSlice';
import { createMarketSlice, MarketSlice } from './marketSlice';
import { createPlayerSlice, PlayerSlice } from './playerSlice';
import { createEventsSlice, EventsSlice } from '../features/events/eventsSlice';
import { createTradingSlice, TradingSlice } from '../features/trading/tradingSlice';
import { createOpsSlice, OpsSlice } from '../features/ops/opsSlice';
import { createOffersSlice, OffersSlice } from '../features/offers/offersSlice';
import { createInfluencerSlice, InfluencerSlice } from '../features/influencer/influencerSlice';
import { createOnboardingSlice, OnboardingSlice } from '../features/onboarding/onboardingSlice';
import { createSocialSlice, SocialSlice } from './socialSlice';
import { createUnlocksSlice, UnlocksSlice } from './unlocksSlice';
import { createNewsSlice, NewsSlice } from '../features/news/newsSlice';
import { executeTick } from '../engine/tick';
import { saveGame, loadGame } from '../utils/persistence';
import { setActiveProfileId } from '../utils/storage';
import { rollDailyNews, applyNewsImpact, checkFakeNewsDebunks, reverseFakeNewsImpact } from '../engine/news';

export type RootStore = EngineSlice & MarketSlice & PlayerSlice & EventsSlice & TradingSlice & OpsSlice & OffersSlice & InfluencerSlice & OnboardingSlice & SocialSlice & UnlocksSlice & NewsSlice & {
  // Orchestration actions
  initGame: () => Promise<void>;
  processTick: () => Promise<void>;
  loadGame: () => Promise<void>;
  saveGame: () => Promise<void>;
};

export const useStore = create<RootStore>((set, get, store) => ({
  // Combine all slices
  ...createEngineSlice(set as any, get as any, store as any),
  ...createMarketSlice(set as any, get as any, store as any),
  ...createPlayerSlice(set as any, get as any, store as any),
  ...createEventsSlice(set as any, get as any, store as any),
  ...createTradingSlice(set as any, get as any, store as any),
  ...createOpsSlice(set as any, get as any, store as any),
  ...createOffersSlice(set as any, get as any, store as any),
  ...createInfluencerSlice(set as any, get as any, store as any),
  ...createOnboardingSlice(set as any, get as any, store as any),
  ...createSocialSlice(set as any, get as any, store as any),
  ...createUnlocksSlice(set as any, get as any, store as any),
  ...createNewsSlice(set as any, get as any, store as any),

  // Orchestration
  initGame: async () => {
    console.log('[rootStore] initGame START');
    const state = get();

    // Initialize new game
    state.init();
    state.loadSeed();
    state.init(); // Re-init player
    state.initInfluencer();
    state.initSocial();
    state.initUnlocks();

    // Set active profile ID in cache if profile exists
    if (state.profile?.id) {
      setActiveProfileId(state.profile.id);
      console.log('[rootStore] Set active profile ID after initGame:', state.profile.id);
    }

    // Save initial state and WAIT for it to complete
    // Note: Historical data (news, price charts) is backfilled separately in Screen3Vibe.tsx
    await state.saveGame();
    console.log('[rootStore] initGame COMPLETE - game saved');
  },

  processTick: async () => {
    const state = get();
    const day = state.day;
    const assets = state.assets;
    const player: any = {
      cashUSD: state.cashUSD,
      netWorthUSD: state.netWorthUSD,
      reputation: state.reputation,
      influence: state.influence,
      security: state.security,
      scrutiny: state.scrutiny,
      exposure: state.exposure,
      holdings: state.holdings,
      lpPositions: state.lpPositions,
      blacklisted: state.blacklisted,
    };

    const result = executeTick(day, assets, player, state.devMode, state.activeOps);

    // Apply updates
    state.applyTickUpdates(result.assetUpdates);
    state.applyUpdates(result.playerUpdates);

    // Push events to feed
    for (const event of result.events) {
      state.pushEvent(event);
    }

    // Add new offers
    if (result.newOffers) {
      for (const offer of result.newOffers) {
        state.addOffer(offer);
        state.pushEvent({
          tick: day,
          type: 'info',
          message: `New ${offer.type === 'gov_bump' ? 'government' : 'whale'} offer available`,
        });
      }
    }

    // Remove expired offers
    const expiredOffers = state.activeOffers.filter((o) => o.expiresAtTick <= day);
    for (const offer of expiredOffers) {
      state.removeOffer(offer.id);
    }

    // Update social stats (reset daily counter)
    state.updateDailySocial();

    // Check post triggers (price moves, viral, horizon)
    state.checkPostTriggers();

    // Check for unlocks
    state.checkUnlocks();

    // Roll daily news (2-5 articles)
    const dailyNews = rollDailyNews(day, assets);
    state.addArticles(dailyNews);

    // Apply news impact to affected assets
    const newsUpdates: Record<string, Partial<any>> = {};
    for (const article of dailyNews) {
      const asset = assets[article.assetId];
      if (asset) {
        const impact = applyNewsImpact(asset, [article]);
        newsUpdates[article.assetId] = {
          ...(newsUpdates[article.assetId] || {}),
          ...impact,
        };

        // Mark impact as realized if price changed significantly
        if (impact.price && Math.abs(impact.price - asset.price) / asset.price > 0.01) {
          state.markImpactRealized(article.id);
        }
      }
    }

    // Apply news-driven price changes
    if (Object.keys(newsUpdates).length > 0) {
      state.applyTickUpdates(newsUpdates);
    }

    // Check for fake news debunks
    const toDebunk = checkFakeNewsDebunks(day, state.articles);
    const debunkUpdates: Record<string, Partial<any>> = {};

    for (const articleId of toDebunk) {
      const article = state.articles.find((a) => a.id === articleId);
      if (article) {
        state.debunkArticle(articleId, day);

        // Reverse the fake hype impact
        const asset = assets[article.assetId];
        if (asset) {
          const reverseImpact = reverseFakeNewsImpact(asset, article);
          debunkUpdates[article.assetId] = {
            ...(debunkUpdates[article.assetId] || {}),
            ...reverseImpact,
          };
        }

        // Add debunk event to feed
        state.pushEvent({
          tick: day,
          type: 'info',
          message: `📰 DEBUNKED: ${article.headline.substring(0, 60)}... was fake news!`,
          severity: 'warning',
        });
      }
    }

    // Apply debunk impacts
    if (Object.keys(debunkUpdates).length > 0) {
      state.applyTickUpdates(debunkUpdates);
    }

    // Clean old news (keep last 200 days)
    state.clearOldNews(day - 200);

    // Save after tick processing and WAIT for it to complete
    await state.saveGame();
  },

  // Load game state from IndexedDB
  loadGame: async () => {
    console.log('[rootStore] loadGame START');
    const savedState = await loadGame();

    if (savedState) {
      console.log('[rootStore] loadGame - Found saved state, assets:', Object.keys(savedState.assets || {}).length);
      set((prevState) => ({ ...prevState, ...savedState }));

      // Set active profile ID in cache if profile exists
      if (savedState.profile?.id) {
        setActiveProfileId(savedState.profile.id);
        console.log('[rootStore] Set active profile ID:', savedState.profile.id);
      }

      console.log('[rootStore] loadGame COMPLETE');
    } else {
      console.log('[rootStore] loadGame - No saved state found');
    }
  },

  // Save current state to IndexedDB
  saveGame: async () => {
    const state = get();
    console.log('[rootStore] saveGame START - assets:', Object.keys(state.assets || {}).length, 'list:', (state.list || []).length);
    await saveGame(state);
    console.log('[rootStore] saveGame COMPLETE');
  },
}));

// Subscribe to day changes to process game logic
let previousDay = -1; // Start at -1 so initial load doesn't trigger
let isProcessing = false;
let isInitialLoad = true;

useStore.subscribe((state) => {
  // Skip the first state update (initial load from IndexedDB)
  if (isInitialLoad) {
    previousDay = state.day;
    isInitialLoad = false;
    return;
  }

  // Only process tick if day actually advanced (user clicked Next Day or Skip Days)
  if (state.day > previousDay && state.day > 0 && !isProcessing) {
    isProcessing = true;
    useStore.getState().processTick();
    isProcessing = false;
  }
  previousDay = state.day;
});
