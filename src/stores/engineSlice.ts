import { StateCreator } from 'zustand';
import { initRNG, getRNG } from '../engine/rng';
import { MarketVibe } from '../engine/types';

export interface EngineSlice {
  day: number; // Current day number
  tick: number; // Current in-game second (1800 ticks per day)
  seed: number;
  devMode: boolean;

  // Real-time day tracking
  dayStartTimestamp: number; // Unix timestamp when current day started
  realTimeDayDuration: number; // Duration in ms (default 30 minutes)

  // Simulation status - ONE SOURCE OF TRUTH
  simulationStatus: 'backfill' | 'beginning-of-day' | 'trading' | 'end-of-day';

  // Market vibe (daily theme)
  marketVibe: MarketVibe;
  vibeTargetAssets?: string[]; // Assets affected by today's vibe (moonshot/rugseason)

  // Actions
  init: (seed?: number) => void;
  advanceDay: () => void; // Manually advance to next day
  skipDays: (numDays: number) => void; // Skip multiple days
  canAdvanceDay: () => boolean; // Check if 30 minutes have passed
  getTimeUntilNextDay: () => number; // Get remaining time in ms
  isMarketOpen: () => boolean; // Check if market is currently open
  setDevMode: (enabled: boolean) => void;
  startTrading: () => void; // Player clicks to begin trading
  rollMarketVibe: () => MarketVibe; // Select today's market vibe
  selectVibeTargets: (vibe: MarketVibe, assets: Record<string, any>) => string[]; // Select target assets for vibe
}

export const createEngineSlice: StateCreator<EngineSlice> = (set, get) => ({
  day: 1,
  tick: 0,
  seed: Date.now(),
  devMode: false,

  // 30 minutes in milliseconds
  dayStartTimestamp: Date.now(),
  realTimeDayDuration: 30 * 60 * 1000,

  // Simulation status
  simulationStatus: 'backfill',

  // Market vibe
  marketVibe: 'normie',
  vibeTargetAssets: undefined,

  init: (seed?: number) => {
    const finalSeed = seed ?? Date.now();
    initRNG(finalSeed);
    const initialVibe = get().rollMarketVibe();
    set({
      seed: finalSeed,
      day: 1,
      tick: 0,
      dayStartTimestamp: Date.now(), // Will be reset when trading starts
      marketVibe: initialVibe,
    });
  },

  setDevMode: (enabled: boolean) => {
    set({ devMode: enabled });
  },

  advanceDay: () => {
    const state = get();
    const newVibe = state.rollMarketVibe();
    set({
      day: state.day + 1,
      tick: 0, // Reset tick counter for new day
      // DON'T set dayStartTimestamp here - it will be set when player clicks "Start Trading"
      marketVibe: newVibe,
    });
  },

  skipDays: (numDays: number) => {
    const state = get();
    const newVibe = state.rollMarketVibe();
    set({
      day: state.day + numDays,
      tick: 0, // Reset tick counter for new day
      // DON'T set dayStartTimestamp here - it will be set when player clicks "Start Trading"
      marketVibe: newVibe,
    });
  },

  canAdvanceDay: () => {
    const state = get();
    // Always allow manual day advancement (Next Day button always enabled)
    return true;
  },

  getTimeUntilNextDay: () => {
    const state = get();
    // If not trading, return full duration (timer shows 30:00)
    if (state.simulationStatus !== 'trading') return state.realTimeDayDuration;

    const elapsed = Date.now() - state.dayStartTimestamp;
    const remaining = state.realTimeDayDuration - elapsed;

    // If timer expired, set status to end-of-day
    if (remaining <= 0) {
      set({ simulationStatus: 'end-of-day' });
    }

    return Math.max(0, remaining);
  },

  isMarketOpen: () => {
    const state = get();
    return state.simulationStatus === 'trading';
  },

  startTrading: () => {
    set({
      simulationStatus: 'trading',
      dayStartTimestamp: Date.now(), // Start the timer NOW
    });
  },

  rollMarketVibe: (): MarketVibe => {
    const rng = getRNG();
    const roll = rng.range(0, 100);

    // Distribution: Moonshot 10%, Bloodbath 8%, Memefrenzy 15%, Rugseason 3%, Whalewar 3%, Normie 61%
    if (roll < 10) return 'moonshot';
    if (roll < 18) return 'bloodbath';
    if (roll < 33) return 'memefrenzy';
    if (roll < 36) return 'rugseason';
    if (roll < 39) return 'whalewar';
    return 'normie';
  },

  selectVibeTargets: (vibe: MarketVibe, assets: Record<string, any>): string[] => {
    const rng = getRNG();
    const targets: string[] = [];

    if (vibe === 'moonshot') {
      // Select 1-3 random non-rugged assets for moonshot
      const availableAssets = Object.values(assets).filter((a: any) => !a.rugged);
      const numTargets = rng.int(1, 3);

      for (let i = 0; i < numTargets && availableAssets.length > 0; i++) {
        const asset: any = rng.pick(availableAssets);
        targets.push(asset.id);
        availableAssets.splice(availableAssets.indexOf(asset), 1);
      }
    }

    return targets;
  },
});
