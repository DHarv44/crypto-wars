import { StateCreator } from 'zustand';
import { initRNG } from '../engine/rng';

export interface EngineSlice {
  day: number; // Current day number
  seed: number;
  devMode: boolean;

  // Real-time day tracking
  dayStartTimestamp: number; // Unix timestamp when current day started
  realTimeDayDuration: number; // Duration in ms (default 30 minutes)
  marketOpen: boolean; // Whether markets are currently open for trading

  // Actions
  init: (seed?: number) => void;
  advanceDay: () => void; // Manually advance to next day
  skipDays: (numDays: number) => void; // Skip multiple days
  canAdvanceDay: () => boolean; // Check if 30 minutes have passed
  getTimeUntilNextDay: () => number; // Get remaining time in ms
  isMarketOpen: () => boolean; // Check if market is currently open
  setDevMode: (enabled: boolean) => void;
}

export const createEngineSlice: StateCreator<EngineSlice> = (set, get) => ({
  day: 1,
  seed: Date.now(),
  devMode: false,

  // 30 minutes in milliseconds
  dayStartTimestamp: Date.now(),
  realTimeDayDuration: 30 * 60 * 1000,
  marketOpen: true,

  init: (seed?: number) => {
    const finalSeed = seed ?? Date.now();
    initRNG(finalSeed);
    set({
      seed: finalSeed,
      day: 1,
      dayStartTimestamp: Date.now(),
      marketOpen: true,
    });
  },

  setDevMode: (enabled: boolean) => {
    set({ devMode: enabled });
  },

  advanceDay: () => {
    const state = get();
    set({
      day: state.day + 1,
      dayStartTimestamp: Date.now(),
      marketOpen: true,
    });
  },

  skipDays: (numDays: number) => {
    const state = get();
    set({
      day: state.day + numDays,
      dayStartTimestamp: Date.now(),
      marketOpen: true,
    });
  },

  canAdvanceDay: () => {
    const state = get();
    const elapsed = Date.now() - state.dayStartTimestamp;
    return elapsed >= state.realTimeDayDuration;
  },

  getTimeUntilNextDay: () => {
    const state = get();
    const elapsed = Date.now() - state.dayStartTimestamp;
    const remaining = state.realTimeDayDuration - elapsed;
    return Math.max(0, remaining);
  },

  isMarketOpen: () => {
    const state = get();
    return state.marketOpen && !state.canAdvanceDay();
  },
});
