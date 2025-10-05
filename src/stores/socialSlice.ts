/**
 * Social Slice - Social media gameplay loop
 * Player posts about assets, gains/loses followers based on accuracy and engagement
 */

import { StateCreator } from 'zustand';

export type PostType = 'shill' | 'analysis' | 'meme' | 'fud';
export type AnalysisDirection = 'long' | 'short';
export type AnalysisTimeframe = '1d' | '3d' | '1w';

export interface SocialPost {
  id: string;
  tick: number;
  type: PostType;
  assetId: string;
  content: string;

  // Analysis-specific
  direction?: AnalysisDirection;
  timeframe?: AnalysisTimeframe;
  entryPrice?: number;

  // Engagement
  likes: number;
  retweets: number;
  engagement: number; // 0-1 score

  // Outcome (for analysis posts)
  resolved?: boolean;
  correct?: boolean;
  resolveTick?: number;
}

export interface SocialStats {
  followers: number;
  engagement: number; // Moving average 0-1
  credibility: number; // 0.3-0.9 based on accuracy
  influence: number; // Derived 0-10

  // Internal tracking
  postsToday: number;
  lastPostTick: number;
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
  createPost: (type: PostType, assetId: string, content: string, analysisData?: {
    direction: AnalysisDirection;
    timeframe: AnalysisTimeframe;
  }) => void;
  resolveAnalysisPost: (postId: string, correct: boolean) => void;
  checkAnalysisPosts: () => void; // Auto-resolve analysis posts based on price movement
  updateDailySocial: () => void; // Called on day advance
  calculateInfluence: () => number;
}

export const createSocialSlice: StateCreator<SocialSlice> = (set, get) => ({
  social: {
    followers: 100, // Start with 100 followers
    engagement: 0.05, // 5% engagement rate
    credibility: 0.5, // Neutral credibility
    influence: 0,
    postsToday: 0,
    lastPostTick: 0,
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
        lastPostTick: 0,
        totalPosts: 0,
        correctCalls: 0,
        totalCalls: 0,
      },
      posts: [],
    });
  },

  createPost: (type, assetId, content, analysisData) => {
    const state = get();
    const tick = (state as any).tick || 0;
    const social = state.social;

    // Calculate base engagement for this post
    const baseEngagement = Math.random() * 0.1 + 0.02; // 2-12%

    // Fatigue from overposting
    const postsToday = tick === social.lastPostTick ? social.postsToday + 1 : 1;
    const fatigueMultiplier = postsToday === 1 ? 1.0 :
                             postsToday === 2 ? 0.6 :
                             postsToday === 3 ? 0.3 : 0.15;

    const postEngagement = baseEngagement * fatigueMultiplier;

    // Calculate follower delta
    const typeBase = type === 'shill' ? 50 :
                    type === 'analysis' ? 80 :
                    type === 'meme' ? 120 :
                    type === 'fud' ? 40 : 50;

    const viralChance = 0.002 * (social.engagement * 10) * (1 / Math.pow(postsToday, 1.5));
    const isViral = Math.random() < viralChance;
    const viralSpike = isViral ? (Math.random() * 77000 + 3000) * (0.5 + social.credibility) : 0;

    const followerDelta = Math.floor(
      typeBase * social.engagement * (0.6 + 0.8 * social.credibility) * fatigueMultiplier + viralSpike
    );

    // Create post
    const post: SocialPost = {
      id: `post-${Date.now()}-${Math.random()}`,
      tick,
      type,
      assetId,
      content,
      likes: Math.floor(social.followers * postEngagement * 0.3),
      retweets: Math.floor(social.followers * postEngagement * 0.1),
      engagement: postEngagement,
      resolved: type !== 'analysis',
    };

    if (analysisData) {
      const assets = (state as any).assets || {};
      const asset = assets[assetId];
      post.direction = analysisData.direction;
      post.timeframe = analysisData.timeframe;
      post.entryPrice = asset?.price || 0;
    }

    // Update social stats
    const newFollowers = Math.max(0, social.followers + followerDelta);
    const newEngagement = (social.engagement * 0.7) + (postEngagement * 0.3); // Moving average

    set({
      posts: [post, ...state.posts],
      social: {
        ...social,
        followers: newFollowers,
        engagement: newEngagement,
        postsToday,
        lastPostTick: tick,
        totalPosts: social.totalPosts + 1,
      },
    });

    // Push event
    const pushEvent = (state as any).pushEvent;
    if (pushEvent) {
      pushEvent({
        tick,
        type: 'info',
        message: isViral
          ? `🚀 Viral post! +${followerDelta.toLocaleString()} followers`
          : `Posted ${type} on @${assetId} (+${followerDelta} followers)`,
      });
    }
  },

  resolveAnalysisPost: (postId, correct) => {
    const state = get();
    const post = state.posts.find(p => p.id === postId);
    if (!post || post.type !== 'analysis' || post.resolved) return;

    const social = state.social;
    const tick = (state as any).tick || 0;

    // Engagement weight (high engagement = higher credibility impact)
    const engagementWeight = post.engagement > 0.08 ? 1.5 : 1.0;

    // Timeframe weight (longer = higher impact)
    const timeframeWeight = post.timeframe === '1w' ? 1.2 :
                           post.timeframe === '3d' ? 1.0 : 0.8;

    const outcome = correct ? 1 : -1;
    const k = post.engagement > 0.08 ? 0.12 : 0.08;
    const impact = k * outcome * engagementWeight * timeframeWeight;

    const newCredibility = Math.max(0.3, Math.min(0.9, social.credibility + impact));

    // Update post
    const updatedPosts = state.posts.map(p =>
      p.id === postId
        ? { ...p, resolved: true, correct, resolveTick: tick }
        : p
    );

    // Update stats
    set({
      posts: updatedPosts,
      social: {
        ...social,
        credibility: newCredibility,
        correctCalls: correct ? social.correctCalls + 1 : social.correctCalls,
        totalCalls: social.totalCalls + 1,
      },
    });

    // Push event
    const pushEvent = (state as any).pushEvent;
    if (pushEvent) {
      pushEvent({
        tick,
        type: correct ? 'success' : 'warning',
        message: correct
          ? `✅ Correct call! Credibility +${(impact * 100).toFixed(1)}%`
          : `❌ Wrong call. Credibility ${impact < 0 ? impact.toFixed(2) : ''}`,
      });
    }
  },

  checkAnalysisPosts: () => {
    const state = get();
    const tick = (state as any).tick || 0;
    const assets = (state as any).assets || {};

    // Find unresolved analysis posts
    const unresolvedPosts = state.posts.filter(
      p => p.type === 'analysis' && !p.resolved
    );

    unresolvedPosts.forEach(post => {
      if (!post.timeframe || !post.direction || !post.entryPrice) return;

      // Calculate days for timeframe
      const timeframeDays = post.timeframe === '1d' ? 1 :
                           post.timeframe === '3d' ? 3 :
                           post.timeframe === '1w' ? 7 : 3;

      // Check if timeframe has expired
      const ticksElapsed = tick - post.tick;
      if (ticksElapsed >= timeframeDays) {
        // Get current price
        const asset = assets[post.assetId];
        if (!asset) return;

        const currentPrice = asset.price;
        const priceChange = ((currentPrice - post.entryPrice) / post.entryPrice) * 100;

        // Determine if call was correct
        // Threshold: >5% move in predicted direction = correct
        const threshold = 5;
        const correct = post.direction === 'long'
          ? priceChange >= threshold
          : priceChange <= -threshold;

        // Auto-resolve
        get().resolveAnalysisPost(post.id, correct);
      }
    });
  },

  updateDailySocial: () => {
    set((state) => ({
      social: {
        ...state.social,
        postsToday: 0, // Reset daily post count
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
