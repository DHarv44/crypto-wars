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
    const request: ClassifyRequest = {
      task: 'classify_and_pack',
      app: 'HypeWire',
      text,
      mentions,
      seed,
    };

    const response = await anthropic!.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      system: AI_CONFIG.systemPrompt,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(request),
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const result = JSON.parse(content.text) as ClassifyResponse;

    // Validate response
    if (!result.category || !result.sentiment || !result.commentPack) {
      throw new Error('Invalid response structure from Claude');
    }

    return result;
  } catch (error) {
    console.error('AI classification failed:', error);
    return generateFallbackCommentPack(text, mentions, seed);
  }
}
