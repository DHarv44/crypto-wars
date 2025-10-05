/**
 * Social Reactions Computation
 * Local calculation of likes/emojis without AI calls
 */

import type { SocialCategory, SocialEmoji } from '../stores/socialSlice';

/**
 * Poisson distribution approximation
 * Using Knuth's algorithm for λ < 30
 */
function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    // Normal approximation for large λ
    const L = Math.sqrt(lambda);
    const k = Math.floor(lambda + L * (Math.random() * 2 - 1));
    return Math.max(0, k);
  }

  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

/**
 * Binomial distribution
 */
function binomial(n: number, p: number): number {
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (Math.random() < p) count++;
  }
  return count;
}

/**
 * Sample emojis from pool
 */
function sampleEmojis(pool: string[], count: number): SocialEmoji[] {
  const counts: Record<string, number> = {};

  for (let i = 0; i < count; i++) {
    const emoji = pool[Math.floor(Math.random() * pool.length)];
    counts[emoji] = (counts[emoji] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Compute reactions (likes + emojis) for a post
 */
export function computeReactions(
  category: SocialCategory,
  followers: number,
  influence: number,
  engagement: number
): { likes: number; emojis: SocialEmoji[]; reach: number } {
  // Category base multipliers
  const categoryBase: Record<SocialCategory, number> = {
    meme: 1.5,
    shill: 1.1,
    analysis: 1.0,
    news: 1.0,
    update: 0.9,
    question: 0.95,
    fud: 0.9,
  };

  const base = categoryBase[category] || 1.0;

  // Compute lambda for Poisson distribution
  const lambda =
    base *
    Math.pow(followers, 0.6) *
    (0.6 + 0.4 * engagement) *
    (0.5 + influence / 10);

  // Generate likes
  const likes = poisson(lambda);

  // Generate emoji reactions (35% of likes)
  const emojiCount = binomial(likes, 0.35);

  // Emoji pool based on category
  let emojiPool: string[];
  if (category === 'meme') {
    emojiPool = ['🤣', '😂', '💀', '🤡', '🔥'];
  } else if (category === 'fud') {
    emojiPool = ['🔻', '🧻', '💩', '⚠️', '😱'];
  } else if (category === 'analysis') {
    emojiPool = ['📊', '📈', '📉', '💎', '🚀'];
  } else {
    // Default: bullish mix
    emojiPool = ['🚀', '💎', '📈', '🔥', '💰', '🪙', '🌕'];
  }

  const emojis = sampleEmojis(emojiPool, emojiCount);

  // Reach calculation
  const reach = Math.floor(likes * (1 + influence / 5));

  return { likes, emojis, reach };
}

/**
 * Check if a post goes viral
 */
export function isViral(likes: number, followers: number): boolean {
  const threshold = Math.max(100, followers * 0.05);
  return likes > threshold;
}

/**
 * Compute comment budget for a post
 */
export function getCommentBudget(
  likes: number,
  influence: number,
  followers: number
): number {
  const base = 2 + 1.2 * Math.log10(followers + 1) + 0.8 * influence;
  const viral = isViral(likes, followers);

  return Math.min(40, Math.floor(viral ? base * 1.5 : base));
}

/**
 * Distribution of comments over triggers
 * Returns: { immediate: 60%, firstTrigger: 25%, nextTrigger: 10%, horizon: 5% }
 */
export function distributeCommentBudget(totalBudget: number): {
  immediate: number;
  firstTrigger: number;
  nextTrigger: number;
  horizon: number;
} {
  return {
    immediate: Math.floor(totalBudget * 0.6),
    firstTrigger: Math.floor(totalBudget * 0.25),
    nextTrigger: Math.floor(totalBudget * 0.1),
    horizon: Math.max(1, Math.floor(totalBudget * 0.05)),
  };
}
