/**
 * Time Series Database (TSDB) - IndexedDB wrapper for chart data
 * Handles storage, retrieval, and compression of historical price data
 */

import type { TimeSeriesData, CompressedTimeSeries, OHLC, ChartResolution } from './types';

const DB_NAME = 'crypto-wars-tsdb';
const DB_VERSION = 1;
const STORE_NAME = 'timeseries';

/**
 * Initialize IndexedDB
 */
export async function initTSDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });

        // Create indexes for efficient querying
        store.createIndex('profileId', 'profileId', { unique: false });
        store.createIndex('assetId', 'assetId', { unique: false });
        store.createIndex('resolution', 'resolution', { unique: false });
      }
    };
  });
}

/**
 * Generate storage key
 */
function makeKey(profileId: string, assetId: string, resolution: ChartResolution): string {
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
export function decompressTimeSeries(compressed: CompressedTimeSeries): TimeSeriesData {
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

  return {
    profileId: compressed.profileId,
    assetId: compressed.assetId,
    resolution: compressed.resolution,
    data: ohlc,
    events: compressed.events,
    compressed: false,
    timestamp: compressed.timestamp,
  };
}

/**
 * Store time series data
 */
export async function storeTimeSeries(data: TimeSeriesData): Promise<void> {
  const db = await initTSDB();
  const key = makeKey(data.profileId, data.assetId, data.resolution);

  // Compress before storing
  const compressed = compressTimeSeries(data);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

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
): Promise<TimeSeriesData | null> {
  const db = await initTSDB();
  const key = makeKey(profileId, assetId, resolution);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(key);

    request.onsuccess = () => {
      if (!request.result) {
        resolve(null);
      } else {
        const compressed = request.result as CompressedTimeSeries;
        const decompressed = decompressTimeSeries(compressed);
        resolve(decompressed);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete time series for a profile
 */
export async function deleteProfileTimeSeries(profileId: string): Promise<void> {
  const db = await initTSDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
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

/**
 * Get all time series for a profile
 */
export async function getAllProfileTimeSeries(profileId: string): Promise<TimeSeriesData[]> {
  const db = await initTSDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('profileId');

    const request = index.getAll(IDBKeyRange.only(profileId));

    request.onsuccess = () => {
      const compressed = request.result as CompressedTimeSeries[];
      const decompressed = compressed.map(decompressTimeSeries);
      resolve(decompressed);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if time series exists
 */
export async function hasTimeSeries(
  profileId: string,
  assetId: string,
  resolution: ChartResolution
): Promise<boolean> {
  const db = await initTSDB();
  const key = makeKey(profileId, assetId, resolution);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.count(key);

    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error);
  });
}
