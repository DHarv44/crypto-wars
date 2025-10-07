/**
 * IndexedDB utilities for game persistence
 * Migrated from localStorage to IndexedDB for better storage capacity
 */

import {
  saveGameToDB,
  loadGameFromDB,
  getAllGamesFromDB,
  deleteGameFromDB,
  gameExistsInDB,
  getSetting,
  setSetting,
  deleteSetting,
} from '../data/db';
import {
  getCachedActiveProfileId,
  setCachedActiveProfileId,
  getCachedSessionGame,
  setCachedSessionGame,
  clearCache,
} from '../data/storageCache';

export interface PlayerProfile {
  id: string;
  handle: string;
  alias?: string;
  title: string;
  archetype: string;
  vibe: string;
}

export interface SavedGame {
  version: string;
  timestamp: number;
  playerProfile: PlayerProfile;
  gameState?: {
    // Engine
    tick: number;
    seed: number;
    devMode: boolean;
    dayStartTimestamp: number;
    realTimeDayDuration: number;

    // Player
    cashUSD: number;
    netWorthUSD: number;
    holdings: Record<string, number>;
    lpPositions: Array<{
      assetId: string;
      usdDeposited: number;
      depositTick: number;
    }>;
    blacklisted: boolean;
    stats: {
      reputation: number;
      influence: number;
      security: number;
      scrutiny: number;
      exposure: number;
    };

    // Market (assets with current prices)
    assets: Record<
      string,
      {
        id: string;
        symbol: string;
        price: number;
        liquidity: number;
        audited: boolean;
        risk: 'low' | 'medium' | 'high';
      }
    >;

    // Influencer
    influencer: {
      followers: number;
      engagement: number;
      authenticity: number;
    };

    // Operations
    activeOps: Array<{
      id: string;
      opId: string;
      startTick: number;
      endTick: number;
      cost: number;
    }>;

    // Offers
    activeOffers: Array<{
      id: string;
      offerId: string;
      title: string;
      description: string;
      appearTick: number;
      expiryTick: number;
    }>;
  };
}

const VERSION = '1.0.0';

/**
 * Generate a unique ID for a profile
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get active profile ID (sync via cache)
 */
export function getActiveProfileId(): string | null {
  return getCachedActiveProfileId();
}

/**
 * Set active profile ID (sync cache + async persist)
 */
export function setActiveProfileId(id: string): void {
  setCachedActiveProfileId(id);
}

/**
 * Load the currently active game from session cache (sync)
 */
export function loadGame(): SavedGame | null {
  return getCachedSessionGame();
}

/**
 * Load game from IndexedDB (async fallback for initial load)
 */
export async function loadGameAsync(): Promise<SavedGame | null> {
  try {
    // Try session game first
    const sessionGame = await getSetting<SavedGame>('sessionGame');
    if (sessionGame) {
      setCachedSessionGame(sessionGame);
      return sessionGame;
    }

    // Fallback to active profile
    const activeId = await getSetting<string>('activeProfileId');
    if (!activeId) return null;

    const game = await loadGameFromDB(activeId);

    // Update cache
    if (game) {
      setCachedSessionGame(game);
      setCachedActiveProfileId(activeId);
    }

    return game;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

/**
 * Save the currently active game (sync cache + async persist)
 */
export function saveGame(data: Partial<SavedGame>): void {
  try {
    const existing = loadGame();
    if (!existing) {
      console.warn('No active game to save');
      return;
    }

    const updated = {
      ...existing,
      ...data,
      version: VERSION,
      timestamp: Date.now(),
    } as SavedGame;

    // Update cache immediately
    setCachedSessionGame(updated);

    // Persist to IndexedDB in background
    saveGameToDB(updated).catch(err => console.error('Failed to persist game:', err));
  } catch (error) {
    console.error('Failed to save game:', error);
  }
}

/**
 * Save complete game state from Zustand store (ASYNC version - waits for completion)
 */
export async function saveGameStateAsync(state: any): Promise<void> {
  try {
    let existing = loadGame();
    console.log('[saveGameStateAsync] loadGame() returned:', existing ? `SavedGame (id: ${existing.playerProfile?.id})` : 'NULL');

    if (!existing) {
      console.warn('[saveGameStateAsync] No saved game found, cannot save game state');
      return;
    }

    console.log('[saveGameStateAsync] Capturing state - assets:', Object.keys(state.assets || {}).length, 'list:', (state.list || []).length);

    const gameState = {
      // Engine
      tick: state.tick,
      seed: state.seed,
      devMode: state.devMode,
      dayStartTimestamp: state.dayStartTimestamp,
      realTimeDayDuration: state.realTimeDayDuration,

      // Player
      cashUSD: state.cashUSD,
      netWorthUSD: state.netWorthUSD,
      holdings: state.holdings,
      lpPositions: state.lpPositions,
      blacklisted: state.blacklisted,
      stats: {
        reputation: state.reputation,
        influence: state.influence,
        security: state.security,
        scrutiny: state.scrutiny,
        exposure: state.exposure,
      },

      // Market
      assets: state.assets,
      list: state.list,
      filters: state.filters,

      // Influencer
      influencer: {
        followers: state.followers,
        engagement: state.engagement,
        authenticity: state.authenticity,
      },

      // Social
      social: state.social,
      posts: state.posts,

      // Events
      events: state.events,

      // Operations
      activeOps: state.activeOps,

      // Offers
      activeOffers: state.activeOffers,

      // Unlocks
      unlockedFeatures: state.unlockedFeatures,
    };

    const updated = {
      ...existing,
      gameState,
      version: VERSION,
      timestamp: Date.now(),
    } as SavedGame;

    // Update cache
    setCachedSessionGame(updated);

    // Persist to IndexedDB and WAIT for it
    await saveGameToDB(updated);
    await setSetting('sessionGame', updated);

    console.log('[saveGameStateAsync] Successfully saved to IndexedDB');
  } catch (error) {
    console.error('[saveGameStateAsync] Failed to save game state:', error);
  }
}

/**
 * Save complete game state from Zustand store (sync cache + async persist)
 * Call this after every CRUD operation
 */
export function saveGameState(state: any): void {
  try {
    let existing = loadGame();
    console.log('[saveGameState] loadGame() returned:', existing ? `SavedGame (id: ${existing.playerProfile?.id})` : 'NULL');

    // If no saved game exists at all, we can't save state
    // This should only happen during initial app load before any player is created
    if (!existing) {
      console.warn('[saveGameState] No saved game found, cannot save game state');
      return;
    }

    console.log('[saveGameState] Capturing state - assets:', Object.keys(state.assets || {}).length, 'list:', (state.list || []).length);

    const gameState = {
      // Engine
      tick: state.tick,
      seed: state.seed,
      devMode: state.devMode,
      dayStartTimestamp: state.dayStartTimestamp,
      realTimeDayDuration: state.realTimeDayDuration,

      // Player
      cashUSD: state.cashUSD,
      netWorthUSD: state.netWorthUSD,
      holdings: state.holdings,
      lpPositions: state.lpPositions,
      blacklisted: state.blacklisted,
      stats: {
        reputation: state.reputation,
        influence: state.influence,
        security: state.security,
        scrutiny: state.scrutiny,
        exposure: state.exposure,
      },

      // Market
      assets: state.assets,
      list: state.list,
      filters: state.filters,

      // Influencer
      influencer: {
        followers: state.followers,
        engagement: state.engagement,
        authenticity: state.authenticity,
      },

      // Social
      social: state.social,
      posts: state.posts,

      // Events
      events: state.events,

      // Operations
      activeOps: state.activeOps,

      // Offers
      activeOffers: state.activeOffers,

      // Unlocks
      unlockedFeatures: state.unlockedFeatures,
    };

    saveGame({ gameState });
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

/**
 * Load game state from cache (sync)
 * Returns null if no saved state exists or if only profile exists (new game)
 */
export function loadGameState(): any | null {
  try {
    const save = loadGame();
    console.log('[loadGameState] loadGame() returned:', save ? `SavedGame (has gameState: ${!!save.gameState})` : 'NULL');

    if (!save || !save.gameState) {
      console.log('[loadGameState] No save or no gameState, returning null');
      return null;
    }

    console.log('[loadGameState] Extracting gameState:');
    console.log('  - assets count:', Object.keys(save.gameState.assets || {}).length);
    console.log('  - list length:', (save.gameState.list || []).length);
    console.log('  - list sample:', (save.gameState.list || []).slice(0, 3));

    return {
      // Engine
      tick: save.gameState.tick,
      seed: save.gameState.seed,
      devMode: save.gameState.devMode,
      dayStartTimestamp: save.gameState.dayStartTimestamp,
      realTimeDayDuration: save.gameState.realTimeDayDuration,

      // Player
      cashUSD: save.gameState.cashUSD,
      netWorthUSD: save.gameState.netWorthUSD,
      holdings: save.gameState.holdings,
      lpPositions: save.gameState.lpPositions,
      blacklisted: save.gameState.blacklisted,
      reputation: save.gameState.stats.reputation,
      influence: save.gameState.stats.influence,
      security: save.gameState.stats.security,
      scrutiny: save.gameState.stats.scrutiny,
      exposure: save.gameState.stats.exposure,

      // Market
      assets: save.gameState.assets,
      list: save.gameState.list,
      filters: save.gameState.filters,

      // Influencer
      followers: save.gameState.influencer.followers,
      engagement: save.gameState.influencer.engagement,
      authenticity: save.gameState.influencer.authenticity,

      // Social
      social: save.gameState.social,
      posts: save.gameState.posts,

      // Events
      events: save.gameState.events,

      // Operations
      activeOps: save.gameState.activeOps,

      // Offers
      activeOffers: save.gameState.activeOffers,

      // Unlocks
      unlockedFeatures: save.gameState.unlockedFeatures,
    };
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

/**
 * Clear the active save
 */
export async function clearSave(): Promise<void> {
  const activeId = getActiveProfileId();
  if (!activeId) return;

  try {
    // Clear cache immediately
    clearCache();

    // Clear from IndexedDB
    await deleteGameFromDB(activeId);
    await deleteSetting('activeProfileId');
    await deleteSetting('sessionGame');
  } catch (error) {
    console.error('Failed to clear save:', error);
  }
}

/**
 * Check if there's an active saved game (sync)
 */
export function hasSavedGame(): boolean {
  const game = loadGame();
  return game !== null;
}

/**
 * Create a new player profile and add to games store
 */
export async function savePlayerProfile(profile: Omit<PlayerProfile, 'id'>): Promise<void> {
  console.log('savePlayerProfile called with:', profile);

  try {
    const id = generateId();

    const newGame: SavedGame = {
      version: VERSION,
      timestamp: Date.now(),
      playerProfile: {
        ...profile,
        id,
      },
    };

    await saveGameToDB(newGame);

    // Update cache
    setActiveProfileId(id);
    setCachedSessionGame(newGame);

    console.log('Profile saved successfully with ID:', id);
  } catch (error) {
    console.error('Failed to save player profile:', error);
  }
}

/**
 * Load player profile for active game (sync)
 */
export function loadPlayerProfile(): PlayerProfile | null {
  const save = loadGame();
  return save?.playerProfile || null;
}

/**
 * Export game save to .cwars file
 * Format: {handle}-day{tick}-{id}.cwars
 */
export async function exportToFile(profileId?: string): Promise<void> {
  try {
    let save: SavedGame | null;

    if (profileId) {
      save = await loadGameFromDB(profileId);
    } else {
      save = loadGame();
    }

    if (!save) {
      console.error('No save data to export');
      return;
    }

    const json = JSON.stringify(save, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const tick = save.gameState?.tick || 0;
    const handle = save.playerProfile.handle;
    const id = save.playerProfile.id.split('-')[0]; // First part of ID

    const link = document.createElement('a');
    link.href = url;
    link.download = `${handle}-day${tick}-${id}.cwars`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export game:', error);
  }
}

/**
 * Import game save from .cwars file
 * Returns: { imported: SavedGame, existingId?: string, shouldPrompt: boolean }
 */
export async function importFromFile(
  file: File
): Promise<{ imported: SavedGame; existingId?: string; shouldPrompt: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json) as SavedGame;

        // Validate structure
        if (!data.version || !data.playerProfile) {
          reject(new Error('Invalid save file format'));
          return;
        }

        // Version check
        if (data.version !== VERSION) {
          reject(
            new Error(`Incompatible version: this game requires version ${VERSION}, file is ${data.version}`)
          );
          return;
        }

        // Check if profile ID already exists
        const exists = await gameExistsInDB(data.playerProfile.id);

        if (exists) {
          // Return data and flag that we should prompt user
          resolve({
            imported: data,
            existingId: data.playerProfile.id,
            shouldPrompt: true,
          });
        } else {
          // No conflict, safe to import
          await saveGameToDB(data);
          setActiveProfileId(data.playerProfile.id);
          setCachedSessionGame(data);

          resolve({
            imported: data,
            shouldPrompt: false,
          });
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Override existing profile with imported data
 */
export async function overrideProfile(game: SavedGame): Promise<void> {
  await saveGameToDB(game);
  setActiveProfileId(game.playerProfile.id);
  setCachedSessionGame(game);
}

/**
 * Start a new game (clear session, but keep profiles)
 */
export async function startNewGame(): Promise<void> {
  clearCache();
  await deleteSetting('sessionGame');
  await deleteSetting('activeProfileId');
  // Reload page to reset all state
  window.location.reload();
}

/**
 * Get all saved profiles (games)
 */
export async function getAllProfiles(): Promise<SavedGame[]> {
  return await getAllGamesFromDB();
}

/**
 * Load a specific profile by ID and set as active
 */
export async function loadProfile(id: string): Promise<void> {
  const game = await loadGameFromDB(id);
  if (game) {
    setActiveProfileId(id);
    setCachedSessionGame(game);
    window.location.reload();
  }
}

/**
 * Delete a profile by ID
 */
export async function deleteProfile(id: string): Promise<void> {
  try {
    await deleteGameFromDB(id);

    // If deleted profile was active, clear cache
    const activeId = getActiveProfileId();
    if (activeId === id) {
      clearCache();
      await deleteSetting('activeProfileId');
      await deleteSetting('sessionGame');
    }
  } catch (error) {
    console.error('Failed to delete profile:', error);
  }
}
