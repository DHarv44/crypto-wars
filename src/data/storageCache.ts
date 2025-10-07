/**
 * In-memory cache for frequently accessed storage data
 * Provides synchronous access while IndexedDB handles persistence in background
 */

import { getSetting, setSetting } from './db';
import type { SavedGame } from '../utils/storage';

interface CacheState {
  activeProfileId: string | null;
  sessionGame: SavedGame | null;
  initialized: boolean;
}

const cache: CacheState = {
  activeProfileId: null,
  sessionGame: null,
  initialized: false,
};

/**
 * Initialize cache from IndexedDB
 * Call this once at app startup
 */
export async function initCache(): Promise<void> {
  try {
    cache.activeProfileId = await getSetting<string>('activeProfileId');
    cache.sessionGame = await getSetting<SavedGame>('sessionGame');
    cache.initialized = true;
    console.log('[StorageCache] Initialized from IndexedDB');
    console.log('[StorageCache] activeProfileId:', cache.activeProfileId);
    console.log('[StorageCache] sessionGame:', cache.sessionGame ? `Found (has gameState: ${!!cache.sessionGame.gameState})` : 'NULL');
  } catch (error) {
    console.error('[StorageCache] Failed to initialize:', error);
    cache.initialized = true; // Mark as initialized even on error
  }
}

/**
 * Get active profile ID (sync)
 */
export function getCachedActiveProfileId(): string | null {
  if (!cache.initialized) {
    console.warn('[StorageCache] Cache not initialized, returning null');
  }
  return cache.activeProfileId;
}

/**
 * Set active profile ID (sync cache + async persist)
 */
export function setCachedActiveProfileId(id: string | null): void {
  cache.activeProfileId = id;
  // Persist to IndexedDB in background
  if (id) {
    setSetting('activeProfileId', id).catch(err =>
      console.error('[StorageCache] Failed to persist activeProfileId:', err)
    );
  }
}

/**
 * Get session game (sync)
 */
export function getCachedSessionGame(): SavedGame | null {
  if (!cache.initialized) {
    console.warn('[StorageCache] Cache not initialized, returning null');
  }
  console.log('[getCachedSessionGame] Returning:', cache.sessionGame ? `SavedGame (has gameState: ${!!cache.sessionGame.gameState}, assets in gameState: ${cache.sessionGame.gameState?.assets ? Object.keys(cache.sessionGame.gameState.assets).length : 'N/A'})` : 'NULL');
  return cache.sessionGame;
}

/**
 * Set session game (sync cache + async persist)
 */
export function setCachedSessionGame(game: SavedGame | null): void {
  cache.sessionGame = game;
  console.log('[setCachedSessionGame] Called with:', game ? `SavedGame (has gameState: ${!!game.gameState})` : 'NULL');
  // Persist to IndexedDB in background
  if (game) {
    console.log('[setCachedSessionGame] Persisting to IndexedDB...');
    setSetting('sessionGame', game)
      .then(() => console.log('[setCachedSessionGame] Successfully persisted to IndexedDB'))
      .catch(err =>
        console.error('[StorageCache] Failed to persist sessionGame:', err)
      );
  }
}

/**
 * Clear cache
 */
export function clearCache(): void {
  cache.activeProfileId = null;
  cache.sessionGame = null;
}

/**
 * Check if cache is ready
 */
export function isCacheReady(): boolean {
  return cache.initialized;
}
