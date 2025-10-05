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
  return cache.sessionGame;
}

/**
 * Set session game (sync cache + async persist)
 */
export function setCachedSessionGame(game: SavedGame | null): void {
  cache.sessionGame = game;
  // Persist to IndexedDB in background
  if (game) {
    setSetting('sessionGame', game).catch(err =>
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
