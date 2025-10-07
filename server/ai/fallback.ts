/**
 * Fallback templates when AI is unavailable
 * Uses seed for determinism
 */

import { ClassifyResponse } from './classify';
import { ComposeResponse } from './compose';

// Seeded random (simple LCG)
function seededRandom(seed: string): () => number {
  let value = 0;
  for (let i = 0; i < seed.length; i++) {
    value = (value + seed.charCodeAt(i)) % 2147483647;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateFallbackCommentPack(
  text: string,
  mentions: string[],
  seed: string
): ClassifyResponse {
  const rng = seededRandom(seed);

  // Simple heuristic classification
  const lowerText = text.toLowerCase();
  const category = lowerText.includes('moon') || lowerText.includes('🚀')
    ? 'shill'
    : lowerText.includes('dump') || lowerText.includes('📉')
    ? 'fud'
    : lowerText.includes('😂') || lowerText.includes('lol')
    ? 'meme'
    : 'analysis';

  const sentiment =
    lowerText.includes('bull') || lowerText.includes('moon') || lowerText.includes('🚀') || lowerText.includes('pump')
      ? 'bullish'
      : lowerText.includes('bear') || lowerText.includes('dump') || lowerText.includes('crash') || lowerText.includes('🔻') || lowerText.includes('📉') || lowerText.includes('sell') || lowerText.includes('rip')
      ? 'bearish'
      : 'neutral';

  const handles = [
    '@OnChainOwl',
    '@AirdropAndy',
    '@BagHolderMax',
    '@SidewaysSam',
    '@WhaleWatcher',
    '@AuditNerd',
    '@YieldFarmer',
    '@RugDoctor',
  ];

  return {
    category: category as any,
    sentiment: sentiment as any,
    targets: mentions.slice(0, 3),
    horizonDays: 3,
    commentPack: {
      positive: [
        { handle: pickRandom(handles, rng), text: 'Called it early. {ASSET} printing.', emoji: '🚀' },
        { handle: pickRandom(handles, rng), text: 'Entry was clean. Respect.', emoji: null },
        { handle: pickRandom(handles, rng), text: 'Up {RET%}% in {DAYS} days. Legend.', emoji: '💎' },
      ],
      negative: [
        { handle: pickRandom(handles, rng), text: 'This aged like milk. -{RET%}%', emoji: '🔻' },
        { handle: pickRandom(handles, rng), text: 'Lucky guess. Show entries next time.', emoji: null },
        { handle: pickRandom(handles, rng), text: '{ASSET} dumped. What happened?', emoji: '🧻' },
      ],
      neutral: [
        { handle: pickRandom(handles, rng), text: 'Dead coin vibes. Wake me when it moves.', emoji: '😴' },
        { handle: pickRandom(handles, rng), text: 'Sideways city. {DAYS} days of nothing.', emoji: null },
        { handle: pickRandom(handles, rng), text: '{ASSET} doing {ASSET} things.', emoji: '🤷' },
      ],
      verdict: [
        {
          handle: pickRandom(handles, rng),
          text: 'Horizon hit. Net {RET%}% vs your call.',
          emoji: null,
        },
        { handle: pickRandom(handles, rng), text: '{DAYS} days later: {ASSET} at {RET%}%', emoji: '📊' },
      ],
    },
    qualityHints: {
      engagement: 0.5 + rng() * 0.3,
      authenticity: 0.5 + rng() * 0.3,
    },
  };
}

export function generateFallbackPost(assets: string[], seed: string): ComposeResponse {
  const rng = seededRandom(seed);

  const templates = [
    '{ASSET} looking bullish. Chart setup is clean 📈',
    '{ASSET} about to moon. Don\'t say I didn\'t warn you 🚀',
    'Just bought more {ASSET}. This one\'s different 💎',
    '{ASSET} holders eating good tonight 🍽️',
    'If {ASSET} breaks resistance, we\'re heading to Mars 🌕',
  ];

  const target = assets.length > 0 ? assets[0] : 'BTC';
  const template = pickRandom(templates, rng);
  const content = template.replace(/{ASSET}/g, target);

  return {
    mode: 'shill',
    content,
    targets: [target],
    direction: Math.random() > 0.5 ? 'long' : null,
    timeframeDays: 3,
    hashtags: ['WAGMI', target],
    quality: {
      engagement: 0.5 + rng() * 0.3,
      authenticity: 0.5 + rng() * 0.3,
    },
  };
}
