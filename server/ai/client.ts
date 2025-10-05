/**
 * Anthropic Claude API Client
 * Centralized client setup for AI endpoints
 */

import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.CLAUDE_API_KEY;

if (!apiKey) {
  console.warn('⚠️  CLAUDE_API_KEY not set. AI features will use fallback templates.');
}

export const anthropic = apiKey
  ? new Anthropic({ apiKey })
  : null;

export const AI_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 2000,
  temperature: 0.7,
  systemPrompt: `You are the voice of HypeWire, a satirical crypto social network.
Be punchy, non-toxic, authentic. Posts ≤160 chars unless analysis format.
Output JSON only matching the provided schema. No markdown, no explanations.`,
};

export function isAIAvailable(): boolean {
  return anthropic !== null;
}
