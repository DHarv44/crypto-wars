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
import { executeTick } from '../engine/tick';
import { loadGameState, saveGameState } from '../utils/storage';

export type RootStore = EngineSlice & MarketSlice & PlayerSlice & EventsSlice & TradingSlice & OpsSlice & OffersSlice & InfluencerSlice & OnboardingSlice & SocialSlice & UnlocksSlice & {
  // Orchestration actions
  initGame: () => void;
  processTick: () => void;
  loadFromSession: () => void;
  saveToSession: () => void;
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

  // Orchestration
  initGame: () => {
    const state = get();

    // Try to load from session storage first
    const savedState = loadGameState();
    if (savedState) {
      // Restore saved state
      set(savedState);
      console.log('Game state loaded from session storage');
    } else {
      // Initialize new game
      state.init();
      state.loadSeed();
      state.init(); // Re-init player
      state.initInfluencer();
      state.initSocial();
      state.initUnlocks();

      // Save initial state to session
      state.saveToSession();
      console.log('New game initialized and saved to session');
    }
  },

  processTick: () => {
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

    // Check and resolve analysis posts
    state.checkAnalysisPosts();

    // Check for unlocks
    state.checkUnlocks();

    // Save to session after tick processing
    state.saveToSession();
  },

  // Load state from session storage
  loadFromSession: () => {
    const savedState = loadGameState();
    if (savedState) {
      set(savedState);
    }
  },

  // Save current state to session storage
  saveToSession: () => {
    saveGameState(get());
  },
}));

// Subscribe to day changes to process game logic
let previousDay = 0;
let isProcessing = false;

useStore.subscribe((state) => {
  if (state.day > previousDay && state.day > 0 && !isProcessing) {
    isProcessing = true;
    useStore.getState().processTick();
    isProcessing = false;
  }
  previousDay = state.day;
});
