import { StateCreator } from 'zustand';
import { Operation } from '../../engine/types';

export interface OpsSlice {
  activeOps: Operation[];

  // Actions
  addOperation: (op: Operation) => void;
  removeOperation: (opId: string) => void;
  getActiveOps: () => Operation[];
  getOpsByAsset: (assetId: string) => Operation[];
}

export const createOpsSlice: StateCreator<OpsSlice> = (set, get) => ({
  activeOps: [],

  addOperation: (op: Operation) => {
    set((state) => ({
      activeOps: [...state.activeOps, op],
    }));
  },

  removeOperation: (opId: string) => {
    set((state) => ({
      activeOps: state.activeOps.filter((op) => op.id !== opId),
    }));
  },

  getActiveOps: () => {
    return get().activeOps;
  },

  getOpsByAsset: (assetId: string) => {
    return get().activeOps.filter((op) => op.assetId === assetId);
  },
});
