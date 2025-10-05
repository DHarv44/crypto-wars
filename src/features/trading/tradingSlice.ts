import { StateCreator } from 'zustand';

export interface TradingSlice {
  // Modal state
  buySellModalOpen: boolean;
  selectedAssetId: string | null;
  tradeType: 'buy' | 'sell' | null;

  // Actions
  openBuySellModal: (assetId: string, type: 'buy' | 'sell') => void;
  closeBuySellModal: () => void;
}

export const createTradingSlice: StateCreator<TradingSlice> = (set) => ({
  buySellModalOpen: false,
  selectedAssetId: null,
  tradeType: null,

  openBuySellModal: (assetId: string, type: 'buy' | 'sell') => {
    set({
      buySellModalOpen: true,
      selectedAssetId: assetId,
      tradeType: type,
    });
  },

  closeBuySellModal: () => {
    set({
      buySellModalOpen: false,
      selectedAssetId: null,
      tradeType: null,
    });
  },
});
