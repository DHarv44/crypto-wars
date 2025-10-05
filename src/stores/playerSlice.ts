import { StateCreator } from 'zustand';
import { PlayerState } from '../engine/types';

export interface PlayerSlice extends PlayerState {
  // Actions
  init: () => void;
  recalcNetWorth: (prices: Record<string, number>) => void;
  gainCash: (amount: number) => void;
  spendCash: (amount: number) => void;
  adjustStat: (key: keyof PlayerState, delta: number) => void;
  applyUpdates: (updates: Partial<PlayerState>) => void;

  // Selectors
  getKPIs: () => Record<string, number>;
  getPortfolioTable: (assets: Record<string, { symbol: string; price: number }>) => PortfolioEntry[];
  getConcentrationByAsset: () => Record<string, number>;
}

export interface PortfolioEntry {
  assetId: string;
  symbol: string;
  units: number;
  valueUSD: number;
  pctOfTotal: number;
}

export const createPlayerSlice: StateCreator<PlayerSlice> = (set, get) => ({
  cashUSD: 10000,
  netWorthUSD: 10000,
  reputation: 50,
  influence: 0,
  security: 5,
  scrutiny: 0,
  exposure: 0,
  holdings: {},
  lpPositions: [],
  blacklisted: false,

  init: () => {
    set({
      cashUSD: 10000,
      netWorthUSD: 10000,
      reputation: 50,
      influence: 0,
      security: 5,
      scrutiny: 0,
      exposure: 0,
      holdings: {},
      lpPositions: [],
      blacklisted: false,
    });
  },

  recalcNetWorth: (prices: Record<string, number>) => {
    const state = get();
    let netWorth = state.cashUSD;

    for (const [assetId, units] of Object.entries(state.holdings)) {
      if (prices[assetId]) {
        netWorth += units * prices[assetId];
      }
    }

    for (const lp of state.lpPositions) {
      netWorth += lp.usdDeposited;
    }

    set({ netWorthUSD: netWorth });
  },

  gainCash: (amount: number) => {
    set((state) => ({ cashUSD: state.cashUSD + amount }));
  },

  spendCash: (amount: number) => {
    set((state) => ({ cashUSD: Math.max(0, state.cashUSD - amount) }));
  },

  adjustStat: (key, delta) => {
    set((state) => ({
      [key]: typeof state[key] === 'number' ? (state[key] as number) + delta : state[key],
    }));
  },

  applyUpdates: (updates: Partial<PlayerState>) => {
    set((state) => ({ ...state, ...updates }));
  },

  getKPIs: () => {
    const state = get();
    return {
      cash: state.cashUSD,
      netWorth: state.netWorthUSD,
      reputation: state.reputation,
      influence: state.influence,
      security: state.security,
      scrutiny: state.scrutiny,
      exposure: state.exposure,
    };
  },

  getPortfolioTable: (assets) => {
    const state = get();
    const entries: PortfolioEntry[] = [];
    let totalValue = 0;

    for (const [assetId, units] of Object.entries(state.holdings)) {
      if (units > 0 && assets[assetId]) {
        const value = units * assets[assetId].price;
        entries.push({
          assetId,
          symbol: assets[assetId].symbol,
          units,
          valueUSD: value,
          pctOfTotal: 0, // Will calculate after
        });
        totalValue += value;
      }
    }

    // Calculate percentages
    for (const entry of entries) {
      entry.pctOfTotal = totalValue > 0 ? (entry.valueUSD / totalValue) * 100 : 0;
    }

    return entries.sort((a, b) => b.valueUSD - a.valueUSD);
  },

  getConcentrationByAsset: () => {
    const state = get();
    const total = state.netWorthUSD;
    const concentration: Record<string, number> = {};

    for (const [assetId, units] of Object.entries(state.holdings)) {
      if (units > 0) {
        concentration[assetId] = units / total;
      }
    }

    return concentration;
  },
});
