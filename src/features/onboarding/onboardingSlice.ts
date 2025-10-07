import { StateCreator } from 'zustand';

export type Archetype = 'meme-mogul' | 'rug-academic' | 'otc-fixer' | 'bot-rancher';
export type Vibe = 'shill-maxx' | 'market-zen' | 'investigative-fud';
export type Toggle = 'diamond-hands' | 'paper-hands' | 'anon-mask' | null;

export interface Profile {
  id: string;
  handle: string;
  alias: string;
  title: string;
  archetype: Archetype;
  vibe: Vibe;
}

export interface OnboardingSlice {
  // State
  hasCompletedOnboarding: boolean;
  currentScreen: number;
  handle: string;
  alias: string;
  title: string;
  archetype: Archetype | null;
  vibe: Vibe | null;
  toggle: Toggle;
  profile: Profile | null;

  // Actions
  setScreen: (screen: number) => void;
  setHandle: (handle: string) => void;
  setAlias: (alias: string) => void;
  setTitle: (title: string) => void;
  setArchetype: (archetype: Archetype) => void;
  setVibe: (vibe: Vibe) => void;
  setToggle: (toggle: Toggle) => void;
  setProfile: (profile: Profile) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const createOnboardingSlice: StateCreator<OnboardingSlice> = (set) => ({
  // Initial state
  hasCompletedOnboarding: false,
  currentScreen: 0,
  handle: '',
  alias: '',
  title: 'Rug Baron',
  archetype: null,
  vibe: null,
  toggle: null,
  profile: null,

  // Actions
  setScreen: (screen) => set({ currentScreen: screen }),
  setHandle: (handle) => set({ handle }),
  setAlias: (alias) => set({ alias }),
  setTitle: (title) => set({ title }),
  setArchetype: (archetype) => set({ archetype }),
  setVibe: (vibe) => set({ vibe }),
  setToggle: (toggle) => set({ toggle }),
  setProfile: (profile) => set({ profile }),

  completeOnboarding: () => set({ hasCompletedOnboarding: true }),

  resetOnboarding: () =>
    set({
      hasCompletedOnboarding: false,
      currentScreen: 0,
      handle: '',
      alias: '',
      title: 'Rug Baron',
      archetype: null,
      vibe: null,
      toggle: null,
      profile: null,
    }),
});
