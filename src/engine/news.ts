import { Asset, NewsArticle, MarketVibe } from './types';
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
 * Generate rug pull warning news for risky assets
 * Returns warning articles that mark assets as warned
 */
export function generateRugWarnings(
  day: number,
  assets: Record<string, Asset>
): { articles: NewsArticle[]; warnedAssets: string[] } {
  const rng = getRNG();
  const articles: NewsArticle[] = [];
  const warnedAssets: string[] = [];

  // Find risky shitcoins that aren't already warned or rugged
  const riskyAssets = Object.values(assets).filter(
    (a) =>
      a.tier === 'shitcoin' &&
      !a.rugged &&
      !a.rugWarned &&
      (a.devTokensPct > 40 || a.auditScore < 0.3)
  );

  if (riskyAssets.length === 0) return { articles, warnedAssets };

  // 20% chance to generate 1-2 warnings per day
  if (!rng.chance(0.2)) return { articles, warnedAssets };

  const numWarnings = rng.int(1, Math.min(2, riskyAssets.length));

  for (let i = 0; i < numWarnings; i++) {
    const asset = rng.pick(riskyAssets);
    riskyAssets.splice(riskyAssets.indexOf(asset), 1); // Remove to avoid duplicates

    const warningTemplates = [
      `🚨 Community members raise concerns about ${asset.symbol} tokenomics`,
      `⚠️ ${asset.symbol} developers moving large amounts to exchanges`,
      `🔍 Suspicious wallet activity detected in ${asset.symbol}`,
      `📊 ${asset.symbol} liquidity pool showing signs of drainage`,
      `🚩 Anonymous devs behind ${asset.symbol} raise red flags`,
      `⚠️ ${asset.symbol} audit reveals critical vulnerabilities`,
    ];

    articles.push({
      id: `warning_${day}_${i}_${Date.now()}`,
      day,
      assetId: asset.id,
      assetSymbol: asset.symbol,
      headline: rng.pick(warningTemplates).replace('${asset.symbol}', asset.symbol),
      sentiment: 'bearish',
      weight: 60,
      category: 'security',
      isFake: false,
      impactRealized: false,
    });

    warnedAssets.push(asset.id);
  }

  return { articles, warnedAssets };
}

/**
 * Generate predictive news hints about upcoming market vibe
 * 30% chance to generate 1-2 hints, some may be fake
 */
export function generateVibeHints(
  day: number,
  nextDayVibe: MarketVibe,
  assets: Record<string, Asset>
): NewsArticle[] {
  const rng = getRNG();
  const articles: NewsArticle[] = [];

  // 30% chance to generate hints
  if (!rng.chance(0.3)) return articles;

  const vibeHintTemplates: Record<MarketVibe, { real: string[]; fake: string[] }> = {
    moonshot: {
      real: [
        '📈 Analysts predict major rally in select altcoins tomorrow',
        '🚀 Whale accumulation signals potential moonshot brewing',
        '💎 Technical indicators showing bullish divergence across markets',
      ],
      fake: [
        '📉 Market correction expected across all sectors',
        '⚠️ Regulatory crackdown rumors spreading',
      ],
    },
    bloodbath: {
      real: [
        '📉 Major liquidation event predicted for tomorrow',
        '🔴 Market sentiment turning bearish across exchanges',
        '⚠️ Analysts warn of incoming market downturn',
      ],
      fake: [
        '📈 Bull run continuation expected',
        '🚀 New institutional buyers entering market',
      ],
    },
    rugseason: {
      real: [
        '🚨 Security researchers warn of increased rug pull activity',
        '⚠️ Multiple projects showing suspicious dev behavior',
        '🔍 Community urges caution with new token launches',
      ],
      fake: [
        '✅ New auditing standards to protect investors',
        '🛡️ Regulatory safeguards being implemented',
      ],
    },
    whalewar: {
      real: [
        '🐋 Large wallets battling for market dominance',
        '⚡ Extreme volatility expected from whale activity',
        '📊 Competing institutions driving massive swings',
      ],
      fake: [
        '💤 Market expected to remain stable and boring',
        '📉 Low volume day predicted',
      ],
    },
    memefrenzy: {
      real: [
        '🔥 Social media buzz reaching fever pitch',
        '📱 Viral trends driving unprecedented hype',
        '🎭 Meme culture taking over crypto markets',
      ],
      fake: [
        '📊 Fundamentals-based trading to dominate',
        '🎓 Serious investors returning to market',
      ],
    },
    normie: {
      real: [
        '💤 Standard trading day expected tomorrow',
        '📊 Markets showing typical volatility patterns',
        '⏰ Business as usual for crypto traders',
      ],
      fake: [
        '🚀 Major catalyst event expected',
        '⚡ Unprecedented market action incoming',
      ],
    },
  };

  const templates = vibeHintTemplates[nextDayVibe];
  const numHints = rng.int(1, 2);
  const allVibes: MarketVibe[] = ['moonshot', 'bloodbath', 'memefrenzy', 'rugseason', 'whalewar', 'normie'];

  for (let i = 0; i < numHints; i++) {
    // 70% chance for real hint, 30% for fake (red herring)
    const isFake = rng.chance(0.3);

    let headline: string;
    let predictedVibe: MarketVibe = nextDayVibe;

    if (isFake) {
      // Fake news: pick a DIFFERENT vibe's real templates to mislead
      const otherVibes = allVibes.filter(v => v !== nextDayVibe);
      const fakeVibe = rng.pick(otherVibes);
      headline = rng.pick(vibeHintTemplates[fakeVibe].real);
      predictedVibe = fakeVibe; // Store which vibe the fake news is actually predicting
    } else {
      // Real news: pick from correct vibe's real templates
      headline = rng.pick(templates.real);
    }

    // Pick a random asset for context (not critical to the vibe)
    const assetList = Object.values(assets).filter((a) => !a.rugged);
    const asset = rng.pick(assetList);

    articles.push({
      id: `vibe_hint_${day}_${i}_${Date.now()}`,
      day,
      assetId: asset?.id || 'btc',
      assetSymbol: asset?.symbol || 'BTC',
      headline,
      sentiment: nextDayVibe === 'bloodbath' || nextDayVibe === 'rugseason' ? 'bearish' : 'bullish',
      weight: 40,
      category: 'prediction',
      isFake,
      predictedVibe, // Add this field
      impactRealized: false,
    });
  }

  return articles;
}

/**
 * Get news summary for display (latest N articles)
 */
export function getNewsTickerData(allNews: NewsArticle[], count: number = 10): NewsArticle[] {
  return allNews
    .sort((a, b) => b.day - a.day) // Most recent first
    .slice(0, count);
}
