/**
 * Social Mentions Parser
 * Handles @BTC and $ETH style mentions with typeahead
 */

export interface ParsedMention {
  symbol: string;
  position: number;
  raw: string;
}

/**
 * Parse @/$ mentions from text
 * Returns array of unique symbols (max 3)
 */
export function parseMentions(text: string): string[] {
  const regex = /[@$]([A-Z]{2,10})/gi;
  const matches = [...text.matchAll(regex)];
  const symbols = matches.map((m) => m[1].toUpperCase());

  // Unique, max 3
  return [...new Set(symbols)].slice(0, 3);
}

/**
 * Get detailed mention info for validation
 */
export function extractMentions(text: string): ParsedMention[] {
  const regex = /[@$]([A-Z]{2,10})/gi;
  const matches = [...text.matchAll(regex)];

  return matches.map((m) => ({
    symbol: m[1].toUpperCase(),
    position: m.index || 0,
    raw: m[0],
  }));
}

/**
 * Validate a mention against available assets
 */
export function validateMention(
  symbol: string,
  assets: Record<string, any>
): boolean {
  return !!assets[symbol.toUpperCase()];
}

/**
 * Apply diminishing returns weights to multi-asset mentions
 */
export function applyMentionWeights(symbols: string[]): { symbol: string; weight: number }[] {
  const weights = [1.0, 0.7, 0.5];

  return symbols.slice(0, 3).map((symbol, idx) => ({
    symbol,
    weight: weights[idx] || 0.5,
  }));
}

/**
 * Get typeahead suggestions for mentions
 * Prioritizes: owned assets > trending (high volume) > alphabetical
 */
export function getMentionSuggestions(
  query: string,
  assets: Record<string, any>,
  holdings: Record<string, number> = {},
  limit: number = 5
): string[] {
  const lowerQuery = query.toLowerCase();

  const assetList = Object.values(assets)
    .filter((a: any) => !a.rugged)
    .map((a: any) => ({
      symbol: a.symbol,
      owned: !!holdings[a.id],
      volume: a.liquidityUSD * (a.socialHype || 0),
    }));

  // Filter by query
  const filtered = assetList.filter((a) =>
    a.symbol.toLowerCase().startsWith(lowerQuery)
  );

  // Sort: owned first, then by volume
  filtered.sort((a, b) => {
    if (a.owned && !b.owned) return -1;
    if (!a.owned && b.owned) return 1;
    return b.volume - a.volume;
  });

  return filtered.slice(0, limit).map((a) => a.symbol);
}

/**
 * Highlight mentions in text for display
 */
export function highlightMentions(text: string): string {
  return text.replace(/[@$]([A-Z]{2,10})/gi, '<mark>$&</mark>');
}

/**
 * Replace mentions with clickable links
 */
export function linkifyMentions(text: string): string {
  return text.replace(
    /[@$]([A-Z]{2,10})/gi,
    '<a href="/asset/$1" class="mention">$&</a>'
  );
}
