/**
 * Classification + Comment Pack Generation
 * Single AI call per post
 */

import { anthropic, AI_CONFIG, isAIAvailable } from './client';
import { generateFallbackCommentPack } from './fallback';

export interface ClassifyRequest {
  task: 'classify_and_pack';
  app: 'HypeWire';
  text: string;
  mentions: string[];
  seed: string;
}

export interface ClassifyResponse {
  category: 'analysis' | 'shill' | 'meme' | 'fud' | 'news' | 'update' | 'question';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  targets: string[];
  horizonDays: number;
  commentPack: {
    positive: Array<{ handle: string; text: string; emoji: string | null }>;
    negative: Array<{ handle: string; text: string; emoji: string | null }>;
    neutral: Array<{ handle: string; text: string; emoji: string | null }>;
    verdict: Array<{ handle: string; text: string; emoji: string | null }>;
  };
  qualityHints: {
    engagement: number;
    authenticity: number;
  };
}

export async function classifyAndPack(
  text: string,
  mentions: string[],
  seed: string
): Promise<ClassifyResponse> {
  if (!isAIAvailable()) {
    console.log('AI unavailable, using fallback for classification');
    return generateFallbackCommentPack(text, mentions, seed);
  }

  try {
    const mentionsStr = mentions.length > 0 ? mentions.map(m => `$${m}`).join(', ') : 'none';

    const prompt = `You are analyzing a social media post from a crypto trading game called "Crypto Wars" on a platform called "HypeWire".

POST TO ANALYZE:
"${text}"

MENTIONED CRYPTOCURRENCIES: ${mentionsStr}

Your task is to classify this post and generate realistic comment packs that will appear based on how the post performs.

CLASSIFICATION REQUIREMENTS:
1. **category**: Choose one - "analysis" (technical/fundamental analysis), "shill" (promoting a coin), "meme" (joke/humor), "fud" (fear/uncertainty/doubt), "news" (breaking news), "update" (general update), "question" (asking for opinions)

2. **sentiment**: Determine the POST'S OVERALL EMOTIONAL TONE about the asset's future:
   - "bullish" = Positive about the asset. Advocating to BUY or HOLD. Expecting price recovery or gains. Keywords: moon, pump, buy the dip, diamond hands, HODL, LFG
   - "bearish" = Negative about the asset. Complaining about dumps/crashes. Expressing disappointment, frustration, or loss. Keywords: dumping, crashing, rekt, sold, exit, ghosted, bag holder. Even memes/jokes about losses are BEARISH.
   - "neutral" = Genuinely neutral observation without emotional bias. Just stating facts, asking questions, or making observations without clear positive/negative emotion.

   IMPORTANT:
   - A post complaining "coin is dumping" or "got rekt" = BEARISH (even if joking)
   - A post saying "buying the dip" or "diamond hands" = BULLISH (even if price is down)
   - Pure jokes with no clear stance = NEUTRAL

3. **horizonDays**: Time frame for this post's prediction (1-7 days). Short-term hype = 1-2 days, medium analysis = 3-5 days, long-term = 7 days.

4. **commentPack**: Generate realistic crypto Twitter comments that will be revealed progressively based on post performance:
   - **positive**: 7 comments for when the call is RIGHT (coin goes up for bullish, down for bearish). Use {ASSET} for coin symbol, {RET%} for return %, {DAYS} for days elapsed.
   - **negative**: 7 comments for when the call is WRONG (coin goes opposite direction). Can be sarcastic/critical.
   - **neutral**: 4 comments for when coin barely moves (sideways/no clear direction).
   - **verdict**: 2 comments for when horizon time is reached, summarizing outcome.

   Comment handles should be like @CryptoWhale, @DegenTrader, @OnChainAnalyst, etc. Keep comments under 100 chars. Make them spicy and entertaining but not toxic. Total: 20 comments.

5. **qualityHints**:
   - **engagement** (0.0-1.0): How likely to get interactions? Memes/hype = high, boring updates = low
   - **authenticity** (0.0-1.0): Does it seem genuine? Thoughtful analysis = high, spam/shill = low

Return ONLY valid JSON in this exact structure (no markdown, no explanations):

{
  "category": "shill",
  "sentiment": "bullish",
  "targets": ["BTC", "ETH"],
  "horizonDays": 3,
  "commentPack": {
    "positive": [
      { "handle": "@CryptoKing", "text": "Called it! {ASSET} up {RET%}% 🚀", "emoji": "🚀" },
      { "handle": "@WhaleWatcher", "text": "This aged well. Respect.", "emoji": null },
      { "handle": "@DegenLord", "text": "{ASSET} printing in {DAYS} days 💎", "emoji": "💎" },
      { "handle": "@MoonBoy", "text": "LFG! {ASSET} going parabolic", "emoji": "🌙" },
      { "handle": "@GigaBrain", "text": "Genius call. Up {RET%}%", "emoji": "🧠" },
      { "handle": "@DiamondHands", "text": "This is why we hold {ASSET}", "emoji": "💎" },
      { "handle": "@BullRun", "text": "Chart looking beautiful. {RET%}% gains", "emoji": "📈" }
    ],
    "negative": [
      { "handle": "@BearGang", "text": "This aged like milk. Down {RET%}% 📉", "emoji": "📉" },
      { "handle": "@Rekt", "text": "{ASSET} did the opposite lmao", "emoji": null },
      { "handle": "@PortfolioDown", "text": "NGMI. Should've inversed this", "emoji": "🤡" },
      { "handle": "@BagHolder", "text": "Down {RET%}% in {DAYS} days. Pain.", "emoji": "😭" },
      { "handle": "@SmartMoney", "text": "I sold. This call was terrible", "emoji": null },
      { "handle": "@RugPull", "text": "{ASSET} holders in shambles", "emoji": "💀" },
      { "handle": "@CopeLord", "text": "Delete this. Embarrassing.", "emoji": "🗑️" }
    ],
    "neutral": [
      { "handle": "@SidewaysSam", "text": "{ASSET} doing absolutely nothing", "emoji": "😴" },
      { "handle": "@Patience", "text": "{DAYS} days of crabbing. Wake me up", "emoji": null },
      { "handle": "@ChartGuy", "text": "Sideways city. {ASSET} stuck in range", "emoji": "🦀" },
      { "handle": "@BoringMarket", "text": "Still waiting for movement on {ASSET}", "emoji": "⏰" }
    ],
    "verdict": [
      { "handle": "@Analyst", "text": "{DAYS}d later: {ASSET} net {RET%}%", "emoji": "📊" },
      { "handle": "@Scorekeeper", "text": "Horizon reached. {ASSET} moved {RET%}%", "emoji": null }
    ]
  },
  "qualityHints": {
    "engagement": 0.75,
    "authenticity": 0.6
  }
}`;

    const response = await anthropic!.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Clean up response - remove markdown code blocks if present
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText) as ClassifyResponse;

    // Validate response
    if (!result.category || !result.sentiment || !result.commentPack) {
      throw new Error('Invalid response structure from Claude');
    }

    // Ensure targets array
    if (!result.targets) {
      result.targets = mentions.slice(0, 3);
    }

    console.log('[AI Classify] Success:', { category: result.category, sentiment: result.sentiment, targets: result.targets });

    return result;
  } catch (error) {
    console.error('AI classification failed:', error);
    return generateFallbackCommentPack(text, mentions, seed);
  }
}
