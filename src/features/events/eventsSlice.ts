import { StateCreator } from 'zustand';
import { GameEvent } from '../../engine/types';

export interface EventsSlice {
  feed: GameEvent[];
  maxFeedSize: number;

  // Actions
  pushEvent: (event: GameEvent) => void;
  clearFeed: () => void;
  getRecent: (n: number) => GameEvent[];
}

export const createEventsSlice: StateCreator<EventsSlice> = (set, get) => ({
  feed: [],
  maxFeedSize: 50,

  pushEvent: (event: GameEvent) => {
    set((state) => ({
      feed: [event, ...state.feed].slice(0, state.maxFeedSize),
    }));
  },

  clearFeed: () => {
    set({ feed: [] });
  },

  getRecent: (n: number) => {
    return get().feed.slice(0, n);
  },
});
