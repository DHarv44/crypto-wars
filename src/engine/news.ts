import { Asset, NewsArticle } from './types';
import { getRNG } from './rng';
import newsSeedData from './news.seed.json';

interface NewsTemplate {
  id: string;
  template: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  category: string;
  isFake?: boolean;
}

const templates = newsSeedData as NewsTemplate[];

/**
 * Roll 2-5 random news articles for the day
 */
export function rollDailyNews(
  day: number,
  assets: Record<string, Asset>
): NewsArticle[] {
  const rng = getRNG();
  const assetList = Object.values(assets).filter((a) => !a.rugged);

  if (assetList.length === 0) return [];

  // Roll 2-5 articles per day
  const numArticles = rng.int(2, 5);
  const articles: NewsArticle[] = [];

  for (let i = 0; i < numArticles; i++) {
    // Pick random asset
    const asset = rng.pick(assetList);

    // Pick random template
    const template = rng.pick(templates);

    // Replace {SYMBOL} placeholder
    const headline = template.template.replace('{SYMBOL}', asset.symbol);

    articles.push({
      id: `news_${day}_${i}_${Date.now()}`,
      day,
      assetId: asset.id,
      assetSymbol: asset.symbol,
      headline,
      sentiment: template.sentiment,
      weight: template.weight,
      category: template.category,
      isFake: template.isFake || false,
      impactRealized: false,
    });
  }

  return articles;
}

/**
 * Apply news impact to asset pricing and social hype
 * Returns updated asset properties
 */
export function applyNewsImpact(
  asset: Asset,
  relevantNews: NewsArticle[]
): Partial<Asset> {
  const rng = getRNG();
  let priceMultiplier = 1.0;
  let hypeAccumulator = 0;

  // Filter out debunked fake news
  const activeNews = relevantNews.filter((n) => !n.debunkedDay);

  for (const article of activeNews) {
    // Fake news doesn't move price directly, only hype (and gets reversed later)
    if (article.isFake) {
      const fakeHypeImpact = (article.weight / 100) * 0.15; // Reduced impact
      hypeAccumulator += article.sentiment === 'bullish' ? fakeHypeImpact : -fakeHypeImpact;
      continue;
    }

    // High-weight news (61-100): Direct price impact
    if (article.weight >= 61) {
      const impactPercent = (article.weight / 100) * rng.range(0.10, 0.25); // 10-25% max

      if (article.sentiment === 'bullish') {
        priceMultiplier *= 1 + impactPercent;
      } else if (article.sentiment === 'bearish') {
        priceMultiplier *= 1 - impactPercent;
      }

      // High-weight also affects hype
      hypeAccumulator += (article.weight / 100) * 0.2 * (article.sentiment === 'bullish' ? 1 : -1);
    }
    // Medium-weight news (31-60): Affects hype and volatility
    else if (article.weight >= 31) {
      hypeAccumulator += (article.weight / 100) * 0.3 * (article.sentiment === 'bullish' ? 1 : article.sentiment === 'bearish' ? -1 : 0);
    }
    // Low-weight news (0-30): Only affects hype slightly
    else {
      hypeAccumulator += (article.weight / 100) * 0.15 * (article.sentiment === 'bullish' ? 1 : article.sentiment === 'bearish' ? -1 : 0);
    }
  }

  // Calculate new values
  const newPrice = asset.price * priceMultiplier;
  const newSocialHype = Math.max(0, Math.min(1, asset.socialHype + hypeAccumulator));

  return {
    price: newPrice,
    socialHype: newSocialHype,
  };
}

/**
 * Check if fake news should be debunked (1-3 days after publication)
 */
export function checkFakeNewsDebunks(
  currentDay: number,
  allNews: NewsArticle[]
): string[] {
  const rng = getRNG();
  const toDebunk: string[] = [];

  for (const article of allNews) {
    // Already debunked
    if (article.debunkedDay) continue;

    // Not fake
    if (!article.isFake) continue;

    // Check if enough time has passed (1-3 days)
    const daysSincePublished = currentDay - article.day;

    if (daysSincePublished >= 1) {
      // Chance to debunk increases each day
      const debunkChance = Math.min(0.9, daysSincePublished * 0.3);

      if (rng.chance(debunkChance)) {
        toDebunk.push(article.id);
      }
    }
  }

  return toDebunk;
}

/**
 * Reverse the hype impact of debunked fake news
 */
export function reverseFakeNewsImpact(
  asset: Asset,
  debunkedNews: NewsArticle
): Partial<Asset> {
  // Reverse the hype impact (slightly reduced)
  const hypeReversal = (debunkedNews.weight / 100) * 0.1; // Half the original fake impact
  const adjustment = debunkedNews.sentiment === 'bullish' ? -hypeReversal : hypeReversal;

  return {
    socialHype: Math.max(0, Math.min(1, asset.socialHype + adjustment)),
  };
}

/**
 * Get news summary for display (latest N articles)
 */
export function getNewsTickerData(allNews: NewsArticle[], count: number = 10): NewsArticle[] {
  return allNews
    .sort((a, b) => b.day - a.day) // Most recent first
    .slice(0, count);
}
