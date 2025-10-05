import { StateCreator } from 'zustand';
import { Offer } from '../../engine/types';

export interface OffersSlice {
  activeOffers: Offer[];
  addOffer: (offer: Offer) => void;
  removeOffer: (offerId: string) => void;
  acceptOffer: (offerId: string) => void;
  declineOffer: (offerId: string) => void;
  getActiveOffers: () => Offer[];
}

export const createOffersSlice: StateCreator<OffersSlice> = (set, get) => ({
  activeOffers: [],

  addOffer: (offer) => {
    set((state) => ({
      activeOffers: [...state.activeOffers, offer],
    }));
  },

  removeOffer: (offerId) => {
    set((state) => ({
      activeOffers: state.activeOffers.filter((o) => o.id !== offerId),
    }));
  },

  acceptOffer: (offerId) => {
    const offer = get().activeOffers.find((o) => o.id === offerId);
    if (!offer) return;

    // Mark as accepted (will be processed by tick)
    set((state) => ({
      activeOffers: state.activeOffers.map((o) => (o.id === offerId ? { ...o, accepted: true } : o)),
    }));
  },

  declineOffer: (offerId) => {
    get().removeOffer(offerId);
  },

  getActiveOffers: () => {
    return get().activeOffers.filter((o) => !o.accepted);
  },
});
