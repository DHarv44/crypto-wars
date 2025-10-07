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
import { MIN_PRICE } from '../utils/format';

export type RootStore = EngineSlice & MarketSlice & PlayerSlice & EventsSlice & TradingSlice & OpsSlice & OffersSlice & InfluencerSlice & OnboardingSlice & SocialSlice & UnlocksSlice & NewsSlice & {
  // Dirty flag for auto-save optimization
  isDirty: boolean;
  markDirty: () => void;

  // Orchestration actions
  initGame: () => Promise<void>;
  processTick: () => void;  // NEW: Runs every game second (intra-day price updates)
  processDay: () => Promise<void>;  // Runs when day advances (daily events, news, etc)
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

  // Dirty flag for auto-save
  isDirty: false,
  markDirty: () => set({ isDirty: true }),

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

  // NEW: Process a single game tick (1 second of game time)
  // Handles intra-day price updates based on volume
  processTick: () => {
    const state = get();
    const tick = state.tick || 0;
    const day = state.day || 1;
    const assets = state.assets;

    // Increment tick counter
    set({ tick: tick + 1 });

    // For each asset, probabilistically determine if a trade occurs
    const assetUpdates: Record<string, Partial<any>> = {};

    for (const asset of Object.values(assets)) {
      if (asset.rugged) continue;

      // Calculate trade probability based on volume (0-1 scale)
      // Higher volume = more frequent trades
      // Base chance: 10% at volume=0, up to 90% at volume=1
      const tradeChance = 0.1 + (asset.volume * 0.8);
      const rng = Math.random();

      if (rng < tradeChance) {
        // Trade occurs - update price
        const oldPrice = asset.price;
        const noise = (Math.random() - 0.5) * 2 * 0.1; // -0.1 to 0.1

        // Scale volatility for intra-day tick movements (random walk scaling)
        const ticksPerDay = 1800;
        const scaledVolatility = asset.baseVolatility / Math.sqrt(ticksPerDay);

        const sigma = scaledVolatility * (0.8 + asset.socialHype * 0.6) * (1 + noise);
        const delta = (Math.random() - 0.5) * 2 * sigma; // Approximate normal distribution
        const newPrice = Math.max(MIN_PRICE, oldPrice * (1 + delta));

        // Get or create current day's candle in today array
        const priceHistory = asset.priceHistory || {
          today: [],
          d5: [],
          m1: [],
          y1: [],
          y5: [],
        };

        const today = priceHistory.today || [];

        // Add new trade candle to today
        const tradeCandle = {
          tick: tick + 1,
          day,
          open: oldPrice,
          high: Math.max(oldPrice, newPrice),
          low: Math.min(oldPrice, newPrice),
          close: newPrice,
        };
        today.push(tradeCandle);

        assetUpdates[asset.id] = {
          price: newPrice,
          priceHistory: {
            ...priceHistory,
            today,
          },
        };
      }
    }

    // Apply updates if any trades occurred
    if (Object.keys(assetUpdates).length > 0) {
      state.applyTickUpdates(assetUpdates);

      // Recalculate net worth and update history
      const prices = Object.fromEntries(
        Object.values(assets).map(asset => [asset.id, assetUpdates[asset.id]?.price ?? asset.price])
      );
      state.recalcNetWorth(prices, tick + 1);

      state.markDirty(); // Mark for auto-save
    }
  },

  // Process day advancement (called when day changes)
  // Handles daily events, news, offers, etc
  processDay: async () => {
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

    // Execute daily tick (news, events, offers)
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

    // Aggregate today's trades into resolution arrays (pop/push pattern)
    const priceHistoryUpdates: Record<string, Partial<any>> = {};
    for (const asset of Object.values(state.assets)) {
      const priceHistory = asset.priceHistory;
      if (!priceHistory || !priceHistory.today || priceHistory.today.length === 0) continue;

      // Calculate 3 aggregated candles from today (divide into thirds)
      const today = priceHistory.today;
      const thirdSize = Math.ceil(today.length / 3);
      const third1 = today.slice(0, thirdSize);
      const third2 = today.slice(thirdSize, thirdSize * 2);
      const third3 = today.slice(thirdSize * 2);

      const aggregateCandles = (candles: any[]) => {
        if (candles.length === 0) return null;
        return {
          tick: candles[0].tick,
          day: candles[0].day,
          open: candles[0].open,
          high: Math.max(...candles.map(c => c.high)),
          low: Math.min(...candles.map(c => c.low)),
          close: candles[candles.length - 1].close,
        };
      };

      const newD5Candles = [
        aggregateCandles(third1),
        aggregateCandles(third2),
        aggregateCandles(third3),
      ].filter(c => c !== null);

      // Calculate 1 daily candle from today
      const dailyCandle = aggregateCandles(today);

      // Pop oldest from d5 (remove 3 candles from day 6) and push today's 3
      const newD5 = [...priceHistory.d5.slice(3), ...newD5Candles];

      // Pop oldest from m1 (remove day 31) and push today's 1
      const newM1 = dailyCandle ? [...priceHistory.m1.slice(1), dailyCandle] : priceHistory.m1;

      // Pop oldest from y1 (remove day 366) and push today's 1
      const newY1 = dailyCandle ? [...priceHistory.y1.slice(1), dailyCandle] : priceHistory.y1;

      // y5 is weekly, only update if it's a week boundary (day % 7 === 0)
      let newY5 = priceHistory.y5;
      if (day % 7 === 0 && dailyCandle) {
        newY5 = [...priceHistory.y5.slice(1), dailyCandle];
      }

      priceHistoryUpdates[asset.id] = {
        priceHistory: {
          today: [], // Clear for next day
          d5: newD5,
          m1: newM1,
          y1: newY1,
          y5: newY5,
        },
      };
    }

    // Apply price history updates
    if (Object.keys(priceHistoryUpdates).length > 0) {
      state.applyTickUpdates(priceHistoryUpdates);
    }

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

    // Skip save if no changes since last save
    if (!state.isDirty) {
      console.log('[rootStore] saveGame SKIPPED - no changes');
      return;
    }

    console.log('[rootStore] saveGame START - assets:', Object.keys(state.assets || {}).length, 'list:', (state.list || []).length);
    await saveGame(state);
    set({ isDirty: false }); // Clear dirty flag after successful save
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

  // Only process day if day actually advanced (user clicked Next Day or Skip Days)
  if (state.day > previousDay && state.day > 0 && !isProcessing) {
    isProcessing = true;
    useStore.getState().processDay();
    isProcessing = false;
  }
  previousDay = state.day;
});
