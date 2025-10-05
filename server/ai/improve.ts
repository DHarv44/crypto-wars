/**
 * Improve/Punch-up Post (🧼 Improve button)
 */

import { anthropic, AI_CONFIG, isAIAvailable } from './client';

export interface ImproveRequest {
  task: 'punch_up';
  app: 'HypeWire';
  currentText: string;
  seed: string;
}

export interface ImproveResponse {
  content: string;
}

export async function improvePost(
  currentText: string,
  seed: string
): Promise<ImproveResponse> {
  if (!isAIAvailable()) {
    console.log('AI unavailable, returning original text');
    return { content: currentText };
  }

  try {
    const request: ImproveRequest = {
      task: 'punch_up',
      app: 'HypeWire',
      currentText,
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

    const result = JSON.parse(content.text) as ImproveResponse;

    if (!result.content) {
      throw new Error('Invalid response structure from Claude');
    }

    return result;
  } catch (error) {
    console.error('AI improvement failed:', error);
    return { content: currentText };
  }
}
