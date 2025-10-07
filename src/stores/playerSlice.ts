import { StateCreator } from 'zustand';
import { PlayerState, Trade, PositionCostBasis } from '../engine/types';

export interface PlayerSlice extends PlayerState {
  // Actions
  init: () => void;
  recalcNetWorth: (prices: Record<string, number>, currentTick: number) => void;
  gainCash: (amount: number) => void;
  spendCash: (amount: number) => void;
  adjustStat: (key: keyof PlayerState, delta: number) => void;
  applyUpdates: (updates: Partial<PlayerState>) => void;
  recordTrade: (trade: Omit<Trade, 'id' | 'timestamp'>) => void;

  // Selectors
  getKPIs: () => Record<string, number>;
  getPortfolioTable: (assets: Record<string, { symbol: string; price: number }>) => PortfolioEntry[];
  getConcentrationByAsset: () => Record<string, number>;
  getUnrealizedPnL: (prices: Record<string, number>) => number;
  getTotalPnL: (prices: Record<string, number>) => number;
  getROI: () => number;
  getWinLossRatio: () => { wins: number; losses: number; ratio: number };
  getRecentTrades: (n: number) => Trade[];
  getBestWorstPerformers: (prices: Record<string, number>) => {
    best: Array<{ assetId: string; symbol: string; pnl: number; pnlPct: number }>;
    worst: Array<{ assetId: string; symbol: string; pnl: number; pnlPct: number }>;
  };
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
  trades: [],
  costBasis: {},
  realizedPnL: 0,
  initialNetWorth: 10000,
  netWorthHistory: [{ tick: 0, value: 10000 }],

  init: () => {
    const initialNW = 10000;
    set({
      cashUSD: initialNW,
      netWorthUSD: initialNW,
      reputation: 50,
      influence: 0,
      security: 5,
      scrutiny: 0,
      exposure: 0,
      holdings: {},
      lpPositions: [],
      blacklisted: false,
      trades: [],
      costBasis: {},
      realizedPnL: 0,
      initialNetWorth: initialNW,
      netWorthHistory: [{ tick: 0, value: initialNW }],
    });
  },

  recalcNetWorth: (prices: Record<string, number>, currentTick: number) => {
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

    // Update history (sample every tick or throttle as needed)
    const history = [...state.netWorthHistory];
    const lastEntry = history[history.length - 1];
    if (!lastEntry || lastEntry.tick !== currentTick) {
      history.push({ tick: currentTick, value: netWorth });
      // Keep last 1000 points
      if (history.length > 1000) history.shift();
    }

    set({ netWorthUSD: netWorth, netWorthHistory: history });
  },

  recordTrade: (trade: Omit<Trade, 'id' | 'timestamp'>) => {
    const state = get();
    const newTrade: Trade = {
      ...trade,
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const newTrades = [...state.trades, newTrade];
    let newCostBasis = { ...state.costBasis };
    let newRealizedPnL = state.realizedPnL;

    if (trade.type === 'buy') {
      // Update cost basis
      const current = newCostBasis[trade.assetId] || {
        assetId: trade.assetId,
        totalUnits: 0,
        totalCostUSD: 0,
        avgPrice: 0,
        trades: [],
      };

      newCostBasis[trade.assetId] = {
        ...current,
        totalUnits: current.totalUnits + trade.units,
        totalCostUSD: current.totalCostUSD + trade.totalUSD,
        avgPrice: (current.totalCostUSD + trade.totalUSD) / (current.totalUnits + trade.units),
        trades: [...current.trades, newTrade.id],
      };
    } else if (trade.type === 'sell') {
      // Calculate realized P&L
      const costBasis = newCostBasis[trade.assetId];
      if (costBasis) {
        const costOfSold = costBasis.avgPrice * trade.units;
        const realizedPnL = trade.totalUSD - costOfSold;
        newTrade.realizedPnL = realizedPnL;
        newRealizedPnL += realizedPnL;

        // Update cost basis
        const remainingUnits = costBasis.totalUnits - trade.units;
        if (remainingUnits <= 0.0001) {
          // Position closed
          delete newCostBasis[trade.assetId];
        } else {
          newCostBasis[trade.assetId] = {
            ...costBasis,
            totalUnits: remainingUnits,
            totalCostUSD: costBasis.avgPrice * remainingUnits,
            trades: [...costBasis.trades, newTrade.id],
          };
        }
      }
    }

    set({ trades: newTrades, costBasis: newCostBasis, realizedPnL: newRealizedPnL });
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

  getUnrealizedPnL: (prices: Record<string, number>) => {
    const state = get();
    let unrealizedPnL = 0;

    for (const [assetId, basis] of Object.entries(state.costBasis)) {
      const currentPrice = prices[assetId];
      if (currentPrice && state.holdings[assetId]) {
        const currentValue = state.holdings[assetId] * currentPrice;
        unrealizedPnL += currentValue - basis.totalCostUSD;
      }
    }

    return unrealizedPnL;
  },

  getTotalPnL: (prices: Record<string, number>) => {
    const state = get();
    return state.realizedPnL + get().getUnrealizedPnL(prices);
  },

  getROI: () => {
    const state = get();
    if (state.initialNetWorth === 0) return 0;
    return ((state.netWorthUSD - state.initialNetWorth) / state.initialNetWorth) * 100;
  },

  getWinLossRatio: () => {
    const state = get();
    const sellTrades = state.trades.filter((t) => t.type === 'sell' && t.realizedPnL !== undefined);
    const wins = sellTrades.filter((t) => (t.realizedPnL || 0) > 0).length;
    const losses = sellTrades.filter((t) => (t.realizedPnL || 0) < 0).length;
    const ratio = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;

    return { wins, losses, ratio };
  },

  getRecentTrades: (n: number) => {
    const state = get();
    return state.trades.slice(-n).reverse();
  },

  getBestWorstPerformers: (prices: Record<string, number>) => {
    const state = get();
    const performers: Array<{ assetId: string; symbol: string; pnl: number; pnlPct: number }> = [];

    // Calculate unrealized P&L for each position
    for (const [assetId, basis] of Object.entries(state.costBasis)) {
      const currentPrice = prices[assetId];
      if (currentPrice && state.holdings[assetId]) {
        const currentValue = state.holdings[assetId] * currentPrice;
        const pnl = currentValue - basis.totalCostUSD;
        const pnlPct = (pnl / basis.totalCostUSD) * 100;

        // Get symbol from first trade
        const firstTrade = state.trades.find((t) => t.assetId === assetId);
        const symbol = firstTrade?.assetSymbol || assetId;

        performers.push({ assetId, symbol, pnl, pnlPct });
      }
    }

    performers.sort((a, b) => b.pnl - a.pnl);

    return {
      best: performers.slice(0, 3),
      worst: performers.slice(-3).reverse(),
    };
  },
});
