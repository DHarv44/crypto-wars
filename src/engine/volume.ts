import { Asset, MarketVibe } from './types';

/**
 * Calculate dynamic volume for an asset based on multiple factors
 * Volume range: 0-1 (controls trade frequency)
 *
 * Factors:
 * - Social hype (trending = high volume)
 * - Recent price change (momentum attracts traders)
 * - Market vibe (certain vibes boost specific assets)
 * - Time of day (slow start, frantic end)
 */
export function calculateDynamicVolume(
  asset: Asset,
  marketVibe: MarketVibe,
  tick: number,
  ticksPerDay: number = 1800,
  vibeTargetAssets?: string[]
): number {
  // Base volume from asset properties (0.3-0.7 range)
  let baseVolume = 0.3 + (asset.volume * 0.4);

  // 1. Social Hype Multiplier (0.5x - 1.5x)
  // More hype = more traders watching = higher volume
  const hypeMultiplier = 0.5 + (asset.socialHype * 1.0);

  // 2. Momentum Multiplier (based on price change)
  // Calculate recent price change if history exists
  let momentumMultiplier = 1.0;
  if (asset.priceHistory?.today && asset.priceHistory.today.length > 0) {
    const recentCandles = asset.priceHistory.today.slice(-10); // Last 10 trades
    if (recentCandles.length >= 2) {
      const oldPrice = recentCandles[0].open;
      const newPrice = recentCandles[recentCandles.length - 1].close;
      const priceChange = Math.abs((newPrice - oldPrice) / oldPrice);

      // Big moves attract traders (0.8x - 1.5x)
      momentumMultiplier = 0.8 + (priceChange * 5); // 10% move = 1.3x, 20% move = 1.8x (capped later)
      momentumMultiplier = Math.min(2.0, momentumMultiplier); // Cap at 2x
    }
  }

  // 3. Market Vibe Multiplier
  let vibeMultiplier = 1.0;
  switch (marketVibe) {
    case 'moonshot':
      // Selected assets get massive volume boost
      vibeMultiplier = vibeTargetAssets?.includes(asset.id) ? 2.5 : 0.7;
      break;
    case 'bloodbath':
      // Panic selling = high volume everywhere
      vibeMultiplier = 1.8;
      break;
    case 'memefrenzy':
      // High social hype assets get extra boost
      vibeMultiplier = asset.socialHype > 0.5 ? 2.0 : 1.2;
      break;
    case 'rugseason':
      // Shitcoins get higher volume (people trying to exit)
      vibeMultiplier = asset.tier === 'shitcoin' ? 1.5 : 1.0;
      break;
    case 'whalewar':
      // Extreme volatility = high volume
      vibeMultiplier = 1.6;
      break;
    case 'normie':
      // Normal volume
      vibeMultiplier = 1.0;
      break;
  }

  // 4. Time of Day Multiplier (slow start, frantic end)
  const dayProgress = tick / ticksPerDay; // 0.0 to 1.0
  let timeMultiplier = 1.0;

  if (dayProgress < 0.1) {
    // First 10% of day: slow start (0.5x-0.8x)
    timeMultiplier = 0.5 + (dayProgress * 3); // 0.5 -> 0.8
  } else if (dayProgress > 0.8) {
    // Last 20% of day: frantic end (1.0x-2.0x)
    const endProgress = (dayProgress - 0.8) / 0.2; // 0.0 to 1.0
    timeMultiplier = 1.0 + endProgress; // 1.0 -> 2.0
  }

  // 5. Rugged assets have minimal volume (dead coin)
  if (asset.rugged) {
    return 0.05; // Very low volume
  }

  // Combine all factors
  const finalVolume = baseVolume * hypeMultiplier * momentumMultiplier * vibeMultiplier * timeMultiplier;

  // Clamp to 0-1 range
  return Math.max(0.05, Math.min(1.0, finalVolume));
}

/**
 * Get volume display category for UI
 */
export function getVolumeCategory(volume: number): {
  label: string;
  color: string;
} {
  if (volume < 0.2) return { label: 'Very Low', color: 'gray' };
  if (volume < 0.4) return { label: 'Low', color: 'blue' };
  if (volume < 0.6) return { label: 'Medium', color: 'cyan' };
  if (volume < 0.8) return { label: 'High', color: 'yellow' };
  return { label: 'Very High', color: 'red' };
}
