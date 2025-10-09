/**
 * SIMPLIFIED PERSISTENCE LAYER
 * - Single IndexedDB store for game state
 * - Direct async operations, no cache layer
 * - All operations return promises that must be awaited
 */

import { DB_NAME, DB_VERSION, STORE_GAMES as GAME_STORE, initDB } from '../data/db';

interface GameState {
  // Engine
  day: number;
  isPaused: boolean;
  devMode: boolean;
  dayStartTimestamp: number;
  realTimeDayDuration: number;
  tradingStarted: boolean;
  marketVibe: string;
  vibeTargetAssets?: string[];

  // Player
  cashUSD: number;
  netWorthUSD: number;
  reputation: number;
  influence: number;
  security: number;
  scrutiny: number;
  exposure: number;
  holdings: Record<string, number>;
  lpPositions: any[];
  blacklisted: boolean;
  trades: any[];
  costBasis: Record<string, any>;
  realizedPnL: number;
  initialNetWorth: number;
  netWorthHistory: any[];
  limitOrders: any[];

  // Market
  assets: Record<string, any>;
  list: string[];
  filters: {
    search: string;
    riskLevel: 'all' | 'low' | 'medium' | 'high';
    audited: boolean | null;
  };

  // Social
  social: {
    followers: number;
    reach: number;
    credibility: number;
    viralityMult: number;
    postsMadeToday: number;
  };
  posts: any[];

  // Events
  events: any[];

  // Ops
  activeOps: any[];

  // Offers
  activeOffers: any[];

  // Influencer
  influencer: {
    sentiment: number;
    followers: number;
    activity: number;
    lastPostDay: number;
  };

  // Unlocks
  unlockedFeatures: string[];

  // Onboarding
  hasCompletedOnboarding: boolean;

  // Profile
  profile: {
    handle: string;
    alias: string;
    title: string;
    archetype: string;
    vibe: string;
  } | null;

  // News
  articles: any[];

  // Metadata
  version: number;
  timestamp: number;
}

/**
 * Open the IndexedDB database (use shared initDB)
 */
async function openDB(): Promise<IDBDatabase> {
  return initDB();
}

/**
 * Save game state to IndexedDB
 * CRITICAL: This is async and MUST be awaited
 */
export async function saveGame(state: Partial<GameState>): Promise<void> {
  console.log('[Persistence] saveGame START - assets:', Object.keys(state.assets || {}).length, 'list:', (state.list || []).length);

  try {
    const db = await openDB();

    const gameState: GameState = {
      // Engine
      day: state.day ?? 0,
      isPaused: state.isPaused ?? true,
      devMode: state.devMode ?? false,
      dayStartTimestamp: state.dayStartTimestamp ?? Date.now(),
      realTimeDayDuration: state.realTimeDayDuration ?? (30 * 60 * 1000),

      // Player
      cashUSD: state.cashUSD ?? 10000,
      netWorthUSD: state.netWorthUSD ?? 10000,
      reputation: state.reputation ?? 50,
      influence: state.influence ?? 0,
      security: state.security ?? 50,
      scrutiny: state.scrutiny ?? 0,
      exposure: state.exposure ?? 0,
      holdings: state.holdings ?? {},
      lpPositions: state.lpPositions ?? [],
      blacklisted: state.blacklisted ?? false,
      trades: state.trades ?? [],
      costBasis: state.costBasis ?? {},
      realizedPnL: state.realizedPnL ?? 0,
      initialNetWorth: state.initialNetWorth ?? 10000,
      netWorthHistory: state.netWorthHistory ?? [{ tick: 0, value: 10000 }],
      limitOrders: state.limitOrders ?? [],

      // Market
      assets: state.assets ?? {},
      list: state.list ?? [],
      filters: state.filters ?? { search: '', riskLevel: 'all', audited: null },

      // Social
      social: state.social ?? {
        followers: 100,
        reach: 100,
        credibility: 50,
        viralityMult: 1.0,
        postsMadeToday: 0,
      },
      posts: state.posts ?? [],

      // Events
      events: state.events ?? [],

      // Ops
      activeOps: state.activeOps ?? [],

      // Offers
      activeOffers: state.activeOffers ?? [],

      // Influencer
      influencer: state.influencer ?? {
        sentiment: 0.5,
        followers: 1000000,
        activity: 0.5,
        lastPostDay: 0,
      },

      // Unlocks
      unlockedFeatures: state.unlockedFeatures ?? [],

      // Onboarding
      hasCompletedOnboarding: state.hasCompletedOnboarding ?? false,

      // Profile
      profile: state.profile ?? null,

      // News
      articles: state.articles ?? [],

      // Metadata
      version: DB_VERSION,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAME_STORE], 'readwrite');
      const store = transaction.objectStore(GAME_STORE);

      // Save with playerProfile structure to match keyPath
      const profileId = gameState.profile?.id || 'default';
      const request = store.put({
        playerProfile: { id: profileId },
        gameState: gameState
      });

      request.onerror = () => {
        console.error('[Persistence] Failed to save game:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('[Persistence] saveGame SUCCESS - assets:', Object.keys(gameState.assets).length, 'list:', gameState.list.length);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[Persistence] Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[Persistence] saveGame ERROR:', error);
    throw error;
  }
}

/**
 * Load game state from IndexedDB
 * Returns null if no saved game exists
 */
export async function loadGame(): Promise<Partial<GameState> | null> {
  console.log('[Persistence] loadGame START');

  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAME_STORE], 'readonly');
      const store = transaction.objectStore(GAME_STORE);

      // Get all games and return the first one (or could get by profile ID)
      const request = store.getAll();

      request.onerror = () => {
        console.error('[Persistence] Failed to load game:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const results = request.result;

        if (!results || results.length === 0) {
          console.log('[Persistence] loadGame - No saved game found');
          resolve(null);
          return;
        }

        // Get the first game's gameState
        const gameState = results[0].gameState;

        console.log('[Persistence] loadGame SUCCESS - assets:', Object.keys(gameState.assets || {}).length, 'list:', (gameState.list || []).length);
        resolve(gameState);
      };
    });
  } catch (error) {
    console.error('[Persistence] loadGame ERROR:', error);
    return null;
  }
}

/**
 * Check if a saved game exists
 */
export async function hasSavedGame(): Promise<boolean> {
  try {
    const game = await loadGame();
    return game !== null;
  } catch (error) {
    console.error('[Persistence] hasSavedGame ERROR:', error);
    return false;
  }
}

/**
 * Clear saved game
 */
export async function clearGame(): Promise<void> {
  console.log('[Persistence] clearGame START');

  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAME_STORE], 'readwrite');
      const store = transaction.objectStore(GAME_STORE);
      const request = store.delete('current');

      request.onerror = () => {
        console.error('[Persistence] Failed to clear game:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('[Persistence] clearGame SUCCESS');
        resolve();
      };
    });
  } catch (error) {
    console.error('[Persistence] clearGame ERROR:', error);
    throw error;
  }
}
