/**
 * Unlocks Slice - Progressive feature unlock system
 * One-step-ahead reveal pattern
 */

import { StateCreator } from 'zustand';

export type UnlockableFeature = 'influencer' | 'operations' | 'offers';

export interface UnlockRequirement {
  type: 'followers' | 'engagement' | 'credibility' | 'networth' | 'scrutiny' | 'influence' | 'traderLevel' | 'opsLevel';
  value: number;
  comparator: '>=' | '<=' | '>';
  label: string;
}

export interface FeatureUnlock {
  id: UnlockableFeature;
  name: string;
  description: string;
  perk: string;
  requirements: UnlockRequirement[][]; // Array of OR groups (any group passes)
  unlocked: boolean;
  visible: boolean; // One-step-ahead: only show next tier
}

export interface UnlocksSlice {
  unlocks: Record<UnlockableFeature, FeatureUnlock>;

  // Settings
  showFullRoadmap: boolean;

  // Actions
  initUnlocks: () => void;
  checkUnlocks: () => void;
  unlockFeature: (feature: UnlockableFeature) => void;
  toggleRoadmap: () => void;
  isFeatureUnlocked: (feature: UnlockableFeature) => boolean;
  getNextUnlock: () => FeatureUnlock | null;
  getUnlockProgress: (feature: UnlockableFeature) => string;
}

export const createUnlocksSlice: StateCreator<UnlocksSlice> = (set, get) => ({
  unlocks: {
    influencer: {
      id: 'influencer',
      name: 'Influencer Toolkit',
      description: 'Unlock sponsored posts, collaborations, Twitter Spaces, and token launches',
      perk: 'Sponsored posts, collabs, Spaces, token launch',
      requirements: [
        [
          { type: 'followers', value: 10000, comparator: '>=', label: 'Followers' },
          { type: 'engagement', value: 0.06, comparator: '>=', label: 'Engagement' },
        ],
        [
          { type: 'credibility', value: 0.55, comparator: '>=', label: 'Credibility' },
        ],
      ],
      unlocked: false,
      visible: true, // Always visible (first unlock)
    },
    operations: {
      id: 'operations',
      name: 'Operations Console',
      description: 'Run sophisticated market operations: audits, pumps, wash trading, and bribes',
      perk: 'Audit contracts, pump assets, coordinate trades',
      requirements: [
        [
          { type: 'networth', value: 15000, comparator: '>=', label: 'Net Worth' },
        ],
        [
          { type: 'traderLevel', value: 1, comparator: '>=', label: 'Trader Level' },
        ],
      ],
      unlocked: false,
      visible: false, // Hidden until influencer unlocked
    },
    offers: {
      id: 'offers',
      name: 'Offers Desk',
      description: 'Receive exclusive deals: whale OTC trades, government bumps, and investigations',
      perk: 'Whale OTC, gov bumps, SEC investigations',
      requirements: [
        [
          { type: 'networth', value: 50000, comparator: '>=', label: 'Net Worth' },
          { type: 'influence', value: 3, comparator: '>=', label: 'Influence' },
        ],
        [
          { type: 'traderLevel', value: 2, comparator: '>=', label: 'Trader Level' },
        ],
      ],
      unlocked: false,
      visible: false, // Hidden until operations unlocked
    },
  },

  showFullRoadmap: false,

  initUnlocks: () => {
    set({
      unlocks: {
        influencer: {
          id: 'influencer',
          name: 'Influencer Toolkit',
          description: 'Unlock sponsored posts, collaborations, Twitter Spaces, and token launches',
          perk: 'Sponsored posts, collabs, Spaces, token launch',
          requirements: [
            [
              { type: 'followers', value: 10000, comparator: '>=', label: 'Followers' },
              { type: 'engagement', value: 0.06, comparator: '>=', label: 'Engagement' },
            ],
            [
              { type: 'credibility', value: 0.55, comparator: '>=', label: 'Credibility' },
            ],
          ],
          unlocked: false,
          visible: true,
        },
        operations: {
          id: 'operations',
          name: 'Operations Console',
          description: 'Run sophisticated market operations: audits, pumps, wash trading, and bribes',
          perk: 'Audit contracts, pump assets, coordinate trades',
          requirements: [
            [
              { type: 'networth', value: 15000, comparator: '>=', label: 'Net Worth' },
            ],
            [
              { type: 'traderLevel', value: 1, comparator: '>=', label: 'Trader Level' },
            ],
          ],
          unlocked: false,
          visible: false,
        },
        offers: {
          id: 'offers',
          name: 'Offers Desk',
          description: 'Receive exclusive deals: whale OTC trades, government bumps, and investigations',
          perk: 'Whale OTC, gov bumps, SEC investigations',
          requirements: [
            [
              { type: 'networth', value: 50000, comparator: '>=', label: 'Net Worth' },
              { type: 'influence', value: 3, comparator: '>=', label: 'Influence' },
            ],
            [
              { type: 'traderLevel', value: 2, comparator: '>=', label: 'Trader Level' },
            ],
          ],
          unlocked: false,
          visible: false,
        },
      },
      showFullRoadmap: false,
    });
  },

  checkUnlocks: () => {
    const state = get() as any;
    const unlocks = state.unlocks;

    // Get current values
    const values = {
      followers: state.social?.followers || 0,
      engagement: state.social?.engagement || 0,
      credibility: state.social?.credibility || 0,
      networth: state.netWorthUSD || 0,
      scrutiny: state.scrutiny || 0,
      influence: state.calculateInfluence?.() || 0,
      traderLevel: 0, // TODO: Implement trader level
      opsLevel: 0, // TODO: Implement ops level
    };

    let updates = false;

    // Check each unlock
    Object.keys(unlocks).forEach((key) => {
      const unlock = unlocks[key as UnlockableFeature];
      if (unlock.unlocked) return;

      // Check if any requirement group is met
      const met = unlock.requirements.some((group) =>
        group.every((req) => {
          const current = values[req.type];
          switch (req.comparator) {
            case '>=':
              return current >= req.value;
            case '<=':
              return current <= req.value;
            case '>':
              return current > req.value;
            default:
              return false;
          }
        })
      );

      if (met) {
        state.unlockFeature(key as UnlockableFeature);
        updates = true;
      }
    });

    // Update visibility (one-step-ahead)
    if (!state.showFullRoadmap) {
      const newUnlocks = { ...state.unlocks };

      // Influencer is always visible
      newUnlocks.influencer.visible = true;

      // Operations visible only if influencer unlocked
      newUnlocks.operations.visible = newUnlocks.influencer.unlocked;

      // Offers visible only if operations unlocked
      newUnlocks.offers.visible = newUnlocks.operations.unlocked;

      if (updates) {
        set({ unlocks: newUnlocks });
      }
    }
  },

  unlockFeature: (feature) => {
    const state = get();
    const unlock = state.unlocks[feature];

    if (unlock.unlocked) return;

    set({
      unlocks: {
        ...state.unlocks,
        [feature]: {
          ...unlock,
          unlocked: true,
        },
      },
    });

    // Push celebration event
    const pushEvent = (state as any).pushEvent;
    if (pushEvent) {
      pushEvent({
        tick: (state as any).tick || 0,
        type: 'success',
        message: `🚀 ${unlock.name} Unlocked — send it!`,
      });
    }
  },

  toggleRoadmap: () => {
    set((state) => {
      const showAll = !state.showFullRoadmap;
      const newUnlocks = { ...state.unlocks };

      if (showAll) {
        // Show all unlocks
        Object.keys(newUnlocks).forEach((key) => {
          newUnlocks[key as UnlockableFeature].visible = true;
        });
      } else {
        // One-step-ahead
        newUnlocks.influencer.visible = true;
        newUnlocks.operations.visible = newUnlocks.influencer.unlocked;
        newUnlocks.offers.visible = newUnlocks.operations.unlocked;
      }

      return {
        showFullRoadmap: showAll,
        unlocks: newUnlocks,
      };
    });
  },

  isFeatureUnlocked: (feature) => {
    const state = get();
    return state.unlocks[feature]?.unlocked || false;
  },

  getNextUnlock: () => {
    const state = get();
    const unlocks = state.unlocks;

    // Find first non-unlocked visible feature
    const nextFeature = Object.values(unlocks).find(
      (unlock) => !unlock.unlocked && unlock.visible
    );

    return nextFeature || null;
  },

  getUnlockProgress: (feature) => {
    const state = get() as any;
    const unlock = state.unlocks[feature];

    if (!unlock) {
      return 'No requirements';
    }

    const values = {
      followers: state.social?.followers || 0,
      engagement: state.social?.engagement || 0,
      credibility: state.social?.credibility || 0,
      networth: state.netWorthUSD || 0,
      scrutiny: state.scrutiny || 0,
      influence: state.calculateInfluence?.() || 0,
      traderLevel: 0,
      opsLevel: 0,
    };

    const details: string[] = [];

    unlock.requirements.forEach((group, groupIdx) => {
      const groupLabel = unlock.requirements.length > 1 ? ` (Path ${groupIdx + 1})` : '';
      group.forEach((req) => {
        const current = values[req.type];

        const formatter = req.type === 'engagement' ? (v: number) => `${(v * 100).toFixed(1)}%` :
                         req.type === 'credibility' ? (v: number) => v.toFixed(2) :
                         req.type === 'networth' ? (v: number) => `$${v.toLocaleString()}` :
                         (v: number) => v.toLocaleString();

        details.push(
          `${req.label} ${formatter(current)}/${formatter(req.value)}${groupLabel}`
        );
      });
    });

    return details.join(' • ');
  },
});
