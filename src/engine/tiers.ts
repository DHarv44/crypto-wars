import { Asset, AssetTier } from './types';

/**
 * Classify asset tier based on liquidity and audit score
 *
 * Bluechip: High liquidity (>$5M) AND high audit score (>0.7)
 * Midcap: Medium liquidity ($500K-$5M) OR medium audit (0.4-0.7)
 * Shitcoin: Low liquidity (<$500K) AND/OR low audit (<0.4)
 */
export function classifyAssetTier(asset: Asset): AssetTier {
  const { liquidityUSD, auditScore } = asset;

  // Bluechip: Established, safe coins
  if (liquidityUSD > 5_000_000 && auditScore > 0.7) {
    return 'bluechip';
  }

  // Shitcoin: Low liquidity OR sketchy audit
  if (liquidityUSD < 500_000 || auditScore < 0.4) {
    return 'shitcoin';
  }

  // Everything else is midcap
  return 'midcap';
}

/**
 * Check if asset can be rugged based on tier
 */
export function canAssetRug(asset: Asset): boolean {
  // Bluechips never rug
  if (asset.tier === 'bluechip') return false;

  // Already rugged
  if (asset.rugged) return false;

  return true;
}

/**
 * Check if asset can exit scam based on tier
 */
export function canAssetExitScam(asset: Asset): boolean {
  // Only shitcoins can exit scam
  if (asset.tier !== 'shitcoin') return false;

  // Already rugged
  if (asset.rugged) return false;

  return true;
}
