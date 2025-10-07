import { StateCreator } from 'zustand';
import { Asset } from '../engine/types';
import seedData from '../engine/assets.seed.json';

export interface MarketSlice {
  assets: Record<string, Asset>;
  list: string[];
  filters: {
    search: string;
    riskLevel: 'all' | 'low' | 'medium' | 'high';
    audited: boolean | null;
  };

  // Actions
  loadSeed: () => void;
  applyTickUpdates: (updates: Record<string, Partial<Asset>>) => void;
  getAsset: (id: string) => Asset | undefined;
  setFilter: (key: keyof MarketSlice['filters'], value: unknown) => void;
  addAsset: (asset: Asset) => void;
  setAssetPriceHistory: (assetId: string, priceHistory: any[]) => void;

  // Selectors (derived)
  getFilteredAssets: () => Asset[];
  getTopMovers: (n: number) => Asset[];
}

export const createMarketSlice: StateCreator<MarketSlice> = (set, get) => ({
  assets: {},
  list: [],
  filters: {
    search: '',
    riskLevel: 'all',
    audited: null,
  },

  loadSeed: () => {
    console.log('[loadSeed] STARTING - seedData length:', seedData.length);
    const assets: Record<string, Asset> = {};
    const list: string[] = [];

    for (const seed of seedData) {
      const asset: Asset = {
        ...seed,
        price: seed.basePrice,
        flagged: false,
        rugged: false,
        volume: 0.5, // Default volume (mid-range trading frequency)
        priceHistory: {
          today: [],
          d5: [],
          m1: [],
          y1: [],
          y5: [],
        },
      };
      assets[asset.id] = asset;
      list.push(asset.id);
    }

    console.log('[loadSeed] SETTING - assets:', Object.keys(assets).length, 'list:', list.length);
    set({ assets, list });
    console.log('[loadSeed] DONE');
  },

  applyTickUpdates: (updates: Record<string, Partial<Asset>>) => {
    set((state) => {
      const newAssets = { ...state.assets };
      for (const [id, update] of Object.entries(updates)) {
        if (newAssets[id]) {
          newAssets[id] = { ...newAssets[id], ...update };
        }
      }
      return { ...state, assets: newAssets };
    });
  },

  getAsset: (id: string) => {
    return get().assets[id];
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
  },

  addAsset: (asset: Asset) => {
    set((state) => ({
      assets: { ...state.assets, [asset.id]: asset },
      list: [...state.list, asset.id],
    }));
  },

  setAssetPriceHistory: (assetId: string, priceHistory: any[]) => {
    set((state) => ({
      assets: {
        ...state.assets,
        [assetId]: {
          ...state.assets[assetId],
          priceHistory,
        },
      },
    }));
  },

  getFilteredAssets: () => {
    const state = get();
    let filtered = state.list.map((id) => state.assets[id]).filter(Boolean);

    // Search filter
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.symbol.toLowerCase().includes(search) || a.name.toLowerCase().includes(search)
      );
    }

    // Audited filter
    if (state.filters.audited !== null) {
      filtered = filtered.filter((a) =>
        state.filters.audited ? a.auditScore > 0.5 : a.auditScore <= 0.5
      );
    }

    // Risk level filter
    if (state.filters.riskLevel !== 'all') {
      filtered = filtered.filter((a) => {
        const risk = a.devTokensPct / 100;
        if (state.filters.riskLevel === 'low') return risk < 0.2;
        if (state.filters.riskLevel === 'medium') return risk >= 0.2 && risk < 0.5;
        if (state.filters.riskLevel === 'high') return risk >= 0.5;
        return true;
      });
    }

    return filtered;
  },

  getTopMovers: (n: number) => {
    const state = get();
    const assetsWithChange = state.list
      .map((id) => state.assets[id])
      .filter((a) => a && a.priceHistory && a.priceHistory.length > 0)
      .map((a) => {
        const history = a.priceHistory!;
        const oldPrice = history.length > 5 ? history[history.length - 6].close : a.basePrice;
        const change = ((a.price - oldPrice) / oldPrice) * 100;
        return { asset: a, change: Math.abs(change) };
      });

    assetsWithChange.sort((a, b) => b.change - a.change);
    return assetsWithChange.slice(0, n).map((x) => x.asset);
  },
});
