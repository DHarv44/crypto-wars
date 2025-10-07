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
    const prompt = `You are playing a satirical crypto trading game called "Crypto Wars" where you manage a social media influencer on a platform called "HypeWire".

Your job: Improve this crypto post to be more engaging and entertaining while staying true to the game's satirical tone. The post can mention specific cryptocurrencies (like $BTC, $ETH, $DOGE), make predictions, or discuss market trends - all within the game context.

Rules:
- Keep it under 160 characters (this is crypto Twitter)
- Be punchy, satirical, and entertaining
- If the post is incomplete (like "...give me a reason"), complete it with a creative crypto-related reason
- Add relevant crypto emojis if appropriate (🚀💎📈📉)
- Non-toxic but edgy
- Stay in character as a crypto influencer in this game

Original post: "${currentText}"

Return ONLY the improved post text. No explanations, no JSON, no quotes - just the raw improved text.`;

    const response = await anthropic!.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
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

    const improvedText = content.text.trim();

    if (!improvedText || improvedText === currentText) {
      console.log('Claude returned unchanged or empty text');
      return { content: currentText };
    }

    return { content: improvedText };
  } catch (error) {
    console.error('AI improvement failed:', error);
    return { content: currentText };
  }
}
