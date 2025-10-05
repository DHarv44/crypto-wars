import { StateCreator } from 'zustand';
import { InfluencerState } from '../../engine/types';

export interface InfluencerSlice extends InfluencerState {
  // Actions
  updateInfluencer: (updates: Partial<InfluencerState>) => void;
  gainFollowers: (count: number) => void;
  adjustEngagement: (delta: number) => void;
  adjustAuthenticity: (delta: number) => void;
  initInfluencer: () => void;
}

export const createInfluencerSlice: StateCreator<InfluencerSlice> = (set) => ({
  // Initial state
  followers: 1000,
  engagement: 0.5,
  authenticity: 1.0,
  cloutTier: 1,
  pendingCampaigns: [],
  sponsoredIncomeUSD: 0,
  lastViralTick: undefined,

  // Actions
  updateInfluencer: (updates) => {
    set((state) => ({ ...state, ...updates }));
  },

  gainFollowers: (count) => {
    set((state) => ({
      followers: Math.max(0, state.followers + count),
    }));
  },

  adjustEngagement: (delta) => {
    set((state) => ({
      engagement: Math.max(0, Math.min(1, state.engagement + delta)),
    }));
  },

  adjustAuthenticity: (delta) => {
    set((state) => ({
      authenticity: Math.max(0, Math.min(1, state.authenticity + delta)),
    }));
  },

  initInfluencer: () => {
    set({
      followers: 1000,
      engagement: 0.5,
      authenticity: 1.0,
      cloutTier: 1,
      pendingCampaigns: [],
      sponsoredIncomeUSD: 0,
      lastViralTick: undefined,
    });
  },
});
