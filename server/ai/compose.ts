/**
 * Generate Post (✨ Generate button)
 */

import { anthropic, AI_CONFIG, isAIAvailable } from './client';
import { generateFallbackPost } from './fallback';

export interface ComposeRequest {
  task: 'compose_post';
  app: 'HypeWire';
  modeHint?: 'short' | 'meme' | 'analysis';
  assets?: string[];
  direction?: 'long' | 'short' | null;
  timeframeDays?: number;
  seed: string;
}

export interface ComposeResponse {
  mode: 'analysis' | 'meme' | 'shill' | 'fud' | 'news' | 'update' | 'question';
  content: string;
  targets: string[];
  direction: 'long' | 'short' | null;
  timeframeDays: number;
  hashtags: string[];
  quality: {
    engagement: number;
    authenticity: number;
  };
}

export async function composePost(
  modeHint: string = 'short',
  assets: string[] = [],
  direction: string | null = null,
  timeframeDays: number = 3,
  seed: string
): Promise<ComposeResponse> {
  if (!isAIAvailable()) {
    console.log('AI unavailable, using fallback for composition');
    return generateFallbackPost(assets, seed);
  }

  try {
    const request: ComposeRequest = {
      task: 'compose_post',
      app: 'HypeWire',
      modeHint: modeHint as any,
      assets,
      direction: direction as any,
      timeframeDays,
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

    const result = JSON.parse(content.text) as ComposeResponse;

    if (!result.content) {
      throw new Error('Invalid response structure from Claude');
    }

    return result;
  } catch (error) {
    console.error('AI composition failed:', error);
    return generateFallbackPost(assets, seed);
  }
}
