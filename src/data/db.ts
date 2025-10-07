/**
 * Consolidated IndexedDB wrapper for Crypto Wars
 * Handles game saves and settings
 */

import type { SavedGame } from '../utils/storage';

export const DB_NAME = 'crypto-wars-db';
export const DB_VERSION = 1;

// Object stores
export const STORE_GAMES = 'games';
export const STORE_SETTINGS = 'settings';

/**
 * Initialize consolidated IndexedDB
 */
export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Games store
      if (!db.objectStoreNames.contains(STORE_GAMES)) {
        const gamesStore = db.createObjectStore(STORE_GAMES, { keyPath: 'playerProfile.id' });
        gamesStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

// ========================================
// GAME SAVES
// ========================================

/**
 * Save game to IndexedDB
 */
export async function saveGameToDB(game: SavedGame): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_GAMES, 'readwrite');
    const store = transaction.objectStore(STORE_GAMES);

    const request = store.put(game);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load game from IndexedDB by profile ID
 */
export async function loadGameFromDB(profileId: string): Promise<SavedGame | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_GAMES, 'readonly');
    const store = transaction.objectStore(STORE_GAMES);

    const request = store.get(profileId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all games from IndexedDB
 */
export async function getAllGamesFromDB(): Promise<SavedGame[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_GAMES, 'readonly');
    const store = transaction.objectStore(STORE_GAMES);

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete game from IndexedDB
 */
export async function deleteGameFromDB(profileId: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_GAMES, 'readwrite');
    const store = transaction.objectStore(STORE_GAMES);

    const request = store.delete(profileId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if game exists
 */
export async function gameExistsInDB(profileId: string): Promise<boolean> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_GAMES, 'readonly');
    const store = transaction.objectStore(STORE_GAMES);

    const request = store.count(profileId);

    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error);
  });
}

// ========================================
// SETTINGS
// ========================================

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: any): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);

    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a setting value
 */
export async function getSetting<T = any>(key: string): Promise<T | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readonly');
    const store = transaction.objectStore(STORE_SETTINGS);

    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a setting
 */
export async function deleteSetting(key: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);

    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ========================================
// Time series data is now stored as part of asset.priceHistory in game state
// No separate IndexedDB table needed
