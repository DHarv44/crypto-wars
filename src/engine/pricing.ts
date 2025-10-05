import { Asset } from './types';
import { getRNG } from './rng';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Price update via random walk with volatility modulated by hype
 * σ = baseVolatility * (0.8 + socialHype*0.6) * (1 + noise[-0.1..0.1])
 * Δ ~ Normal(0, σ)
 * price = max(0.0001, price * (1 + Δ))
 */
export function updatePrice(asset: Asset): number {
  if (asset.rugged) return asset.price; // No price movement after rug

  const rng = getRNG();
  const noise = rng.range(-0.1, 0.1);
  const sigma = asset.baseVolatility * (0.8 + asset.socialHype * 0.6) * (1 + noise);
  const delta = rng.normal(0, sigma);

  const newPrice = Math.max(0.0001, asset.price * (1 + delta));
  return newPrice;
}

/**
 * Apply pump operation: short-term upward drift
 */
export function applyPump(asset: Asset, budget: number): number {
  const rng = getRNG();
  const multiplier = 1 + budget / 10000 + rng.range(0, 0.15);
  return asset.price * multiplier;
}

/**
 * Apply wash trading: creates fake volume (handled elsewhere)
 * Price effect minimal, mostly detection risk
 */
export function applyWash(_asset: Asset, _budget: number): void {
  // Wash increases fake volume & detection, not price directly
}

/**
 * Whale buyback event
 */
export function applyWhaleBuyback(asset: Asset): number {
  const rng = getRNG();
  const multiplier = rng.range(2, 4);
  return asset.price * multiplier;
}

/**
 * Oracle hack: massive spike or crash for 1-3 ticks
 */
export function applyOracleHack(asset: Asset): number {
  const rng = getRNG();
  const direction = rng.chance(0.5) ? 1 : -1;
  const magnitude = rng.range(1, 4);
  return Math.max(0.0001, asset.price * (1 + direction * magnitude));
}

/**
 * Rug pull: price crashes hard
 */
export function applyRug(asset: Asset): { price: number; liquidity: number } {
  const rng = getRNG();
  const priceMultiplier = rng.range(0.01, 0.2);
  const liquidityMultiplier = rng.range(0.05, 0.4);
  return {
    price: asset.price * priceMultiplier,
    liquidity: asset.liquidityUSD * liquidityMultiplier,
  };
}
