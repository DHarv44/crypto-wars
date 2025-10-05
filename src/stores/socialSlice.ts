/**
 * Social Slice - HypeWire social media gameplay loop
 * Posts are classified once by AI, comments revealed via triggers
 */

import { StateCreator } from 'zustand';

// Legacy types (kept for compatibility)
export type PostType = 'analysis' | 'shill' | 'meme' | 'fud' | 'news' | 'update' | 'question';
export type AnalysisDirection = 'long' | 'short';
export type AnalysisTimeframe = '1d' | '3d' | '1w';

// New HypeWire types
export type SocialCategory = 'analysis' | 'shill' | 'meme' | 'fud' | 'news' | 'update' | 'question';
export type SocialSentiment = 'bullish' | 'bearish' | 'neutral';
export type SocialTrigger = 'price_move' | 'viral' | 'horizon';

export interface SocialComment {
  handle: string;
  text: string; // May contain {ASSET}, {RET%}, {DAYS} tokens
  emoji: string | null;
  stance?: 'pos' | 'neg' | 'neutral';
  revealedAt?: number; // timestamp when shown
}

export interface SocialCommentPack {
  positive: SocialComment[];
  negative: SocialComment[];
  neutral: SocialComment[];
  verdict: SocialComment[];
}

export interface SocialEmoji {
  emoji: string;
  count: number;
}

export interface SocialMention {
  symbol: string;
  weight: number; // 1.0, 0.7, 0.5
  valid: boolean;
}

export interface SocialPost {
  id: string;
  day: number;
  textRaw: string;
  textFinal: string; // After AI improvement (if used)
  targets: string[]; // ["BTC", "DOGE"] - max 3

  // AI Classification (stored once at T0)
  category: SocialCategory;
  sentiment: SocialSentiment;
  horizonDays: number;

  // Pre-generated comment pack
  commentPack: SocialCommentPack;

  // Reactions (computed locally at T0)
  likes: number;
  emojis: SocialEmoji[];
  reach: number;

  // Quality hints from AI
  qualityHints: {
    engagement: number;
    authenticity: number;
  };

  // Lifecycle tracking
  postedAt: number; // timestamp
  seed: string; // For determinism
  triggersHit: SocialTrigger[];
  commentsShown: SocialComment[];
  resolved: boolean;
  alignment?: number; // -0.25 to +0.25

  // Outcome tracking
  entryPrices: Record<string, number>; // { BTC: 45000 }
}

export interface SocialStats {
  followers: number;
  engagement: number; // Moving average 0-1
  credibility: number; // 0.3-0.9 based on accuracy
  influence: number; // Derived 0-10

  // Internal tracking
  postsToday: number;
  lastPostDay: number;
  totalPosts: number;
  correctCalls: number;
  totalCalls: number;
}

export interface SocialSlice {
  // State
  social: SocialStats;
  posts: SocialPost[];

  // Actions
  initSocial: () => void;
  createPost: (post: Partial<SocialPost>) => void;
  checkPostTriggers: () => void; // Check all posts for trigger conditions
  revealComments: (postId: string, trigger: SocialTrigger, alignment: number) => void;
  updateDailySocial: () => void; // Called on day advance
  calculateInfluence: () => number;

  // Legacy actions (for compatibility during migration)
  resolveAnalysisPost?: (postId: string, correct: boolean) => void;
  checkAnalysisPosts?: () => void;
}

export const createSocialSlice: StateCreator<SocialSlice> = (set, get) => ({
  social: {
    followers: 100,
    engagement: 0.05,
    credibility: 0.5,
    influence: 0,
    postsToday: 0,
    lastPostDay: 0,
    totalPosts: 0,
    correctCalls: 0,
    totalCalls: 0,
  },
  posts: [],

  initSocial: () => {
    set({
      social: {
        followers: 100,
        engagement: 0.05,
        credibility: 0.5,
        influence: 0,
        postsToday: 0,
        lastPostDay: 0,
        totalPosts: 0,
        correctCalls: 0,
        totalCalls: 0,
      },
      posts: [],
    });
  },

  createPost: (postData) => {
    const state = get();
    const day = (state as any).day || 0;
    const social = state.social;

    // Create post with defaults
    const post: SocialPost = {
      id: `post-${Date.now()}-${Math.random()}`,
      day,
      textRaw: postData.textRaw || '',
      textFinal: postData.textFinal || postData.textRaw || '',
      targets: postData.targets || [],
      category: postData.category || 'shill',
      sentiment: postData.sentiment || 'neutral',
      horizonDays: postData.horizonDays || 3,
      commentPack: postData.commentPack || {
        positive: [],
        negative: [],
        neutral: [],
        verdict: [],
      },
      likes: postData.likes || 0,
      emojis: postData.emojis || [],
      reach: postData.reach || 0,
      qualityHints: postData.qualityHints || { engagement: 0.5, authenticity: 0.5 },
      postedAt: Date.now(),
      seed: postData.seed || `${Date.now()}-${Math.random()}`,
      triggersHit: [],
      commentsShown: [],
      resolved: false,
      entryPrices: postData.entryPrices || {},
      ...postData,
    };

    // Calculate follower delta
    const baseFollowerGain = Math.floor(
      social.followers * post.qualityHints.engagement * 0.01 * (0.5 + social.credibility)
    );

    // Update social stats
    const newFollowers = Math.max(0, social.followers + baseFollowerGain);
    const newEngagement = social.engagement * 0.7 + post.qualityHints.engagement * 0.3;

    set({
      posts: [post, ...state.posts],
      social: {
        ...social,
        followers: newFollowers,
        engagement: newEngagement,
        postsToday: day === social.lastPostDay ? social.postsToday + 1 : 1,
        lastPostDay: day,
        totalPosts: social.totalPosts + 1,
      },
    });

    // Push event
    const pushEvent = (state as any).pushEvent;
    if (pushEvent) {
      pushEvent({
        tick: day,
        type: 'info',
        message: `Posted on HypeWire (+${baseFollowerGain} followers)`,
      });
    }
  },

  checkPostTriggers: () => {
    const state = get();
    const assets = (state as any).assets || {};
    const social = state.social;
    const posts = state.posts;

    posts.forEach((post) => {
      if (post.resolved) return;

      const elapsedMs = Date.now() - post.postedAt;
      const elapsedDays = elapsedMs / (30 * 60 * 1000); // 30min = 1 day

      // Trigger A: Price move (5% threshold)
      if (!post.triggersHit.includes('price_move')) {
        for (const target of post.targets) {
          const asset = assets[target];
          if (!asset || !post.entryPrices[target]) continue;

          const ret = (asset.price - post.entryPrices[target]) / post.entryPrices[target];
          if (Math.abs(ret) >= 0.05) {
            const alignment = calculateAlignment(post, assets);
            get().revealComments(post.id, 'price_move', alignment);
            break;
          }
        }
      }

      // Trigger B: Horizon reached
      if (
        elapsedDays >= post.horizonDays &&
        !post.triggersHit.includes('horizon')
      ) {
        const alignment = calculateAlignment(post, assets);
        get().revealComments(post.id, 'horizon', alignment);

        // Update credibility based on alignment
        updateCredibility(state, post, alignment);

        // Mark resolved
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === post.id ? { ...p, resolved: true, alignment } : p
          ),
        }));
      }

      // Trigger C: Viral (dynamic threshold based on followers)
      if (!post.triggersHit.includes('viral')) {
        const viralThreshold = Math.max(100, social.followers * 0.05);
        if (post.likes > viralThreshold) {
          const alignment = calculateAlignment(post, assets);
          get().revealComments(post.id, 'viral', alignment);
        }
      }
    });
  },

  revealComments: (postId, trigger, alignment) => {
    set((state) => {
      const post = state.posts.find((p) => p.id === postId);
      if (!post) return state;

      // Determine comment budget
      const budget =
        trigger === 'price_move' ? 2 : trigger === 'viral' ? 3 : trigger === 'horizon' ? 2 : 1;

      // Pick comments based on alignment
      let pool: SocialComment[];
      if (trigger === 'horizon') {
        pool = post.commentPack.verdict;
      } else {
        pool =
          alignment > 0.05
            ? post.commentPack.positive
            : alignment < -0.05
            ? post.commentPack.negative
            : post.commentPack.neutral;
      }

      // Take comments from pool
      const newComments = pool.slice(0, budget).map((c) => {
        const elapsedDays = (Date.now() - post.postedAt) / (30 * 60 * 1000);
        return {
          ...c,
          text: c.text
            .replace(/{ASSET}/g, post.targets[0] || 'COIN')
            .replace(/{RET%}/g, (alignment * 100).toFixed(1))
            .replace(/{DAYS}/g, Math.floor(elapsedDays).toString()),
          revealedAt: Date.now(),
        };
      });

      return {
        posts: state.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                commentsShown: [...p.commentsShown, ...newComments],
                triggersHit: [...p.triggersHit, trigger],
              }
            : p
        ),
      };
    });
  },

  updateDailySocial: () => {
    set((state) => ({
      social: {
        ...state.social,
        postsToday: 0,
      },
    }));
  },

  calculateInfluence: () => {
    const state = get();
    const { followers, engagement, credibility } = state.social;
    const influence = Math.log10(followers + 1) * engagement * (0.5 + credibility);
    return Math.max(0, Math.min(10, influence));
  },
});

// Helper: Calculate alignment for a post
function calculateAlignment(post: SocialPost, assets: Record<string, any>): number {
  let weightedReturn = 0;
  let totalWeight = 0;

  const weights = [1.0, 0.7, 0.5];

  post.targets.forEach((target, idx) => {
    const asset = assets[target];
    if (!asset || !post.entryPrices[target]) return;

    const ret = (asset.price - post.entryPrices[target]) / post.entryPrices[target];
    const weight = weights[idx] || 0.5;

    weightedReturn += ret * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) return 0;

  const avgReturn = weightedReturn / totalWeight;

  // Apply sentiment
  const sentimentMultiplier =
    post.sentiment === 'bullish' ? 1 : post.sentiment === 'bearish' ? -1 : 0.5 * Math.sign(avgReturn);

  const alignment = sentimentMultiplier * avgReturn;

  // Clamp to [-0.25, +0.25]
  return Math.max(-0.25, Math.min(0.25, alignment));
}

// Helper: Update credibility based on alignment
function updateCredibility(state: any, post: SocialPost, alignment: number) {
  const social = state.social;
  const engagementWeight = post.qualityHints.engagement > 0.6 ? 1.25 : 1.0;

  const horizonWeight =
    post.horizonDays >= 7 ? 1.2 : post.horizonDays >= 3 ? 1.0 : 0.8;

  const k = post.qualityHints.engagement > 0.6 ? 0.12 : 0.08;
  const impact = k * alignment * engagementWeight * horizonWeight;

  const newCredibility = Math.max(0.3, Math.min(0.9, social.credibility + impact));

  const correct = alignment > 0.05;

  state.set({
    social: {
      ...social,
      credibility: newCredibility,
      correctCalls: correct ? social.correctCalls + 1 : social.correctCalls,
      totalCalls: social.totalCalls + 1,
    },
  });

  // Push event
  const pushEvent = state.pushEvent;
  if (pushEvent) {
    pushEvent({
      tick: post.day,
      type: correct ? 'success' : 'warning',
      message: correct
        ? `✅ Good call! Credibility +${(impact * 100).toFixed(1)}%`
        : `❌ Missed. Credibility ${impact < 0 ? (impact * 100).toFixed(1) : ''}%`,
    });
  }
}
