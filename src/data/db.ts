/**
 * Consolidated IndexedDB wrapper for Crypto Wars
 * Handles game saves, settings, and time series data
 */

import type { SavedGame } from '../utils/storage';
import type { TimeSeriesData, CompressedTimeSeries, ChartResolution, OHLC } from './types';

const DB_NAME = 'crypto-wars-db';
const DB_VERSION = 1;

// Object stores
const STORE_GAMES = 'games';
const STORE_SETTINGS = 'settings';
const STORE_TIMESERIES = 'timeseries';

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

      // Time series store
      if (!db.objectStoreNames.contains(STORE_TIMESERIES)) {
        const tsStore = db.createObjectStore(STORE_TIMESERIES, { keyPath: 'key' });
        tsStore.createIndex('profileId', 'profileId', { unique: false });
        tsStore.createIndex('assetId', 'assetId', { unique: false });
        tsStore.createIndex('resolution', 'resolution', { unique: false });
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
// TIME SERIES (moved from tsdb.ts)
// ========================================

/**
 * Generate storage key for time series
 */
function makeTimeSeriesKey(profileId: string, assetId: string, resolution: ChartResolution): string {
  return `${profileId}:${assetId}:${resolution}`;
}

/**
 * Compress time series data using delta encoding
 */
export function compressTimeSeries(data: TimeSeriesData): CompressedTimeSeries {
  const ohlc = data.data;
  const count = ohlc.length;

  if (count === 0) {
    return {
      profileId: data.profileId,
      assetId: data.assetId,
      resolution: data.resolution,
      metadata: { count: 0, startDay: 0, scale: 1 },
      deltas: {
        days: [],
        opens: new Int16Array(0),
        highs: new Int16Array(0),
        lows: new Int16Array(0),
        closes: new Int16Array(0),
      },
      events: data.events,
      timestamp: data.timestamp,
    };
  }

  // Find scale factor (quantize to cents)
  const allPrices = ohlc.flatMap((c) => [c.open, c.high, c.low, c.close]);
  const maxPrice = Math.max(...allPrices);
  const scale = maxPrice / 32767; // Int16 max

  // Delta-of-delta encoding for days
  const dayDeltas: number[] = [];
  let prevDay = ohlc[0].day;
  let prevDelta = 0;

  for (let i = 0; i < count; i++) {
    const currentDelta = ohlc[i].day - prevDay;
    dayDeltas.push(currentDelta - prevDelta);
    prevDelta = currentDelta;
    prevDay = ohlc[i].day;
  }

  // Quantize prices to Int16
  const opens = new Int16Array(count);
  const highs = new Int16Array(count);
  const lows = new Int16Array(count);
  const closes = new Int16Array(count);

  for (let i = 0; i < count; i++) {
    opens[i] = Math.round(ohlc[i].open / scale);
    highs[i] = Math.round(ohlc[i].high / scale);
    lows[i] = Math.round(ohlc[i].low / scale);
    closes[i] = Math.round(ohlc[i].close / scale);
  }

  return {
    profileId: data.profileId,
    assetId: data.assetId,
    resolution: data.resolution,
    metadata: {
      count,
      startDay: ohlc[0].day,
      scale,
    },
    deltas: {
      days: dayDeltas,
      opens,
      highs,
      lows,
      closes,
    },
    events: data.events,
    timestamp: data.timestamp,
  };
}

/**
 * Decompress time series data
 */
export function decompressTimeSeries(compressed: CompressedTimeSeries): OHLC[] {
  const { metadata, deltas } = compressed;
  const { count, startDay, scale } = metadata;

  const ohlc: OHLC[] = [];

  // Reconstruct days from delta-of-delta
  let currentDay = startDay;
  let prevDelta = 0;

  for (let i = 0; i < count; i++) {
    const deltaOfDelta = deltas.days[i];
    const currentDelta = prevDelta + deltaOfDelta;
    currentDay += currentDelta;

    ohlc.push({
      day: currentDay,
      open: deltas.opens[i] * scale,
      high: deltas.highs[i] * scale,
      low: deltas.lows[i] * scale,
      close: deltas.closes[i] * scale,
    });

    prevDelta = currentDelta;
  }

  return ohlc;
}

/**
 * Store time series data
 */
export async function storeTimeSeries(data: TimeSeriesData): Promise<void> {
  const db = await initDB();
  const key = makeTimeSeriesKey(data.profileId, data.assetId, data.resolution);

  // Compress before storing
  const compressed = compressTimeSeries(data);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TIMESERIES, 'readwrite');
    const store = transaction.objectStore(STORE_TIMESERIES);

    const request = store.put({ key, ...compressed });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve time series data
 */
export async function getTimeSeries(
  profileId: string,
  assetId: string,
  resolution: ChartResolution
): Promise<CompressedTimeSeries | null> {
  const db = await initDB();
  const key = makeTimeSeriesKey(profileId, assetId, resolution);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TIMESERIES, 'readonly');
    const store = transaction.objectStore(STORE_TIMESERIES);

    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete time series for a profile
 */
export async function deleteProfileTimeSeries(profileId: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_TIMESERIES, 'readwrite');
    const store = transaction.objectStore(STORE_TIMESERIES);
    const index = store.index('profileId');

    const request = index.openCursor(IDBKeyRange.only(profileId));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}
