import { Asset, MarketVibe, NewsArticle } from './types';
import { getRNG } from './rng';
import { classifyAssetTier } from './tiers';

/**
 * Generate a new shitcoin for launch
 * Most launches are high-risk, meme-style coins
 */
export function generateNewCoin(day: number): Asset {
  const rng = getRNG();

  // Generate meme-style names
  const prefixes = ['Moon', 'Doge', 'Pepe', 'Shib', 'Floki', 'Elon', 'Wojak', 'Chad', 'Based', 'Giga'];
  const suffixes = ['Coin', 'Token', 'Inu', 'Finance', 'Swap', 'Protocol', 'DAO', 'Chain', 'Moon', 'Rocket'];

  const prefix = rng.pick(prefixes);
  const suffix = rng.pick(suffixes);
  const symbol = (prefix.substring(0, 3) + suffix.substring(0, 3)).toUpperCase();
  const name = `${prefix}${suffix}`;
  const id = `new_${day}_${symbol.toLowerCase()}`;

  // Most new coins are shitcoins with sketchy metrics
  const basePrice = rng.range(0.0001, 0.01);
  const liquidityUSD = rng.range(50000, 500000); // Low liquidity
  const devTokensPct = rng.range(30, 70); // High dev control (sketchy!)
  const auditScore = rng.range(0.1, 0.4); // Poor audit
  const socialHype = rng.range(0.6, 0.95); // HIGH hype (that's the point)

  const newCoin: Asset = {
    id,
    symbol,
    name,
    basePrice,
    price: basePrice,
    liquidityUSD,
    devTokensPct,
    auditScore,
    socialHype,
    baseVolatility: rng.range(0.08, 0.15), // High volatility
    govFavorScore: 0.1, // Not favored
    flagged: false,
    rugged: false,
    volume: rng.range(0.6, 0.9), // High initial volume (hype!)
    tier: 'shitcoin', // Will be classified
    momentum: 0.3, // Positive initial momentum
    narrative: 'moon', // Everyone thinks it'll moon
    priceHistory: {
      today: [],
      d5: [],
      m1: [],
      y1: [],
      y5: [],
    },
  };

  // Classify tier (should be shitcoin)
  newCoin.tier = classifyAssetTier(newCoin);

  return newCoin;
}

/**
 * Generate hype-building news for upcoming coin launch
 * Creates 1-3 news articles over 2-3 days before launch
 */
export function generateLaunchHypeNews(
  day: number,
  coinSymbol: string,
  daysUntilLaunch: number
): NewsArticle[] {
  const rng = getRNG();
  const articles: NewsArticle[] = [];

  const hypeTemplates = [
    `🚀 New project ${coinSymbol} generating massive buzz in crypto community`,
    `💎 Early investors accumulating ${coinSymbol} ahead of launch`,
    `📱 ${coinSymbol} trending on crypto social media`,
    `🔥 ${coinSymbol} presale sells out in minutes`,
    `⭐ Influencers backing ${coinSymbol} launch`,
    `💰 ${coinSymbol} promises revolutionary tokenomics`,
    `🌙 ${coinSymbol} aiming for 100x returns`,
  ];

  // Generate 1-2 hype articles
  const numArticles = rng.int(1, 2);

  for (let i = 0; i < numArticles; i++) {
    const headline = rng.pick(hypeTemplates);

    articles.push({
      id: `launch_hype_${day}_${coinSymbol}_${i}`,
      day,
      assetId: `new_${day + daysUntilLaunch}_${coinSymbol.toLowerCase()}`, // Future asset ID
      assetSymbol: coinSymbol,
      headline,
      sentiment: 'bullish',
      weight: 70, // High impact
      category: 'launch',
      isFake: rng.chance(0.4), // 40% chance it's overhyped (fake)
      impactRealized: false,
    });
  }

  return articles;
}

/**
 * Determine if a new coin should launch today
 * Factors: market vibe, random chance, days since last launch
 */
export function shouldLaunchCoin(
  day: number,
  marketVibe: MarketVibe,
  daysSinceLastLaunch: number
): boolean {
  const rng = getRNG();

  // Base 15% chance per day
  let launchChance = 0.15;

  // Market vibe modifiers
  if (marketVibe === 'memefrenzy') launchChance = 0.4; // High chance during meme frenzy
  if (marketVibe === 'rugseason') launchChance = 0.25; // More coins to rug
  if (marketVibe === 'bloodbath') launchChance = 0.05; // Low chance during crash
  if (marketVibe === 'normie') launchChance = 0.1; // Low chance on boring days

  // Don't launch if last launch was too recent (< 3 days)
  if (daysSinceLastLaunch < 3) return false;

  // Higher chance if it's been a while (> 5 days)
  if (daysSinceLastLaunch > 5) launchChance *= 1.5;

  return rng.chance(launchChance);
}

/**
 * Calculate days since last coin launch
 */
export function getDaysSinceLastLaunch(assets: Record<string, Asset>, currentDay: number): number {
  let lastLaunchDay = 0;

  for (const asset of Object.values(assets)) {
    // Check if asset ID indicates it's a launched coin
    if (asset.id.startsWith('new_')) {
      const match = asset.id.match(/new_(\d+)_/);
      if (match) {
        const launchDay = parseInt(match[1]);
        lastLaunchDay = Math.max(lastLaunchDay, launchDay);
      }
    }
  }

  return currentDay - lastLaunchDay;
}
