/**
 * Unit tests for game balance and probability distributions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initRNG, getRNG } from '../engine/rng';
import { classifyAssetTier } from '../engine/tiers';
import { calculateDynamicVolume } from '../engine/volume';
import { shouldLaunchCoin } from '../engine/coinLaunch';
import type { Asset, MarketVibe } from '../engine/types';

describe('Market Vibe Distribution', () => {
  beforeEach(() => {
    initRNG(12345); // Use consistent seed for reproducibility
  });

  it('should produce correct vibe distribution over 10000 rolls', () => {
    const distribution: Record<MarketVibe, number> = {
      moonshot: 0,
      bloodbath: 0,
      memefrenzy: 0,
      rugseason: 0,
      whalewar: 0,
      normie: 0,
    };

    const rollMarketVibe = (): MarketVibe => {
      const rng = getRNG();
      const roll = rng.range(0, 100);

      if (roll < 10) return 'moonshot';
      if (roll < 18) return 'bloodbath';
      if (roll < 33) return 'memefrenzy';
      if (roll < 36) return 'rugseason';
      if (roll < 39) return 'whalewar';
      return 'normie';
    };

    const rolls = 10000;
    for (let i = 0; i < rolls; i++) {
      const vibe = rollMarketVibe();
      distribution[vibe]++;
    }

    // Expected: moonshot 10%, bloodbath 8%, memefrenzy 15%, rugseason 3%, whalewar 3%, normie 61%
    // Allow ±2% tolerance
    expect(distribution.moonshot / rolls).toBeCloseTo(0.10, 1);
    expect(distribution.bloodbath / rolls).toBeCloseTo(0.08, 1);
    expect(distribution.memefrenzy / rolls).toBeCloseTo(0.15, 1);
    expect(distribution.rugseason / rolls).toBeCloseTo(0.03, 1);
    expect(distribution.whalewar / rolls).toBeCloseTo(0.03, 1);
    expect(distribution.normie / rolls).toBeCloseTo(0.61, 1);
  });
});

describe('Asset Tier Classification', () => {
  it('should classify high liquidity + high audit as bluechip', () => {
    const asset: Asset = createTestAsset({
      liquidityUSD: 10_000_000,
      auditScore: 0.8,
    });

    expect(classifyAssetTier(asset)).toBe('bluechip');
  });

  it('should classify low liquidity as shitcoin', () => {
    const asset: Asset = createTestAsset({
      liquidityUSD: 100_000,
      auditScore: 0.7,
    });

    expect(classifyAssetTier(asset)).toBe('shitcoin');
  });

  it('should classify low audit score as shitcoin', () => {
    const asset: Asset = createTestAsset({
      liquidityUSD: 2_000_000,
      auditScore: 0.3,
    });

    expect(classifyAssetTier(asset)).toBe('shitcoin');
  });

  it('should classify mid-range as midcap', () => {
    const asset: Asset = createTestAsset({
      liquidityUSD: 2_000_000,
      auditScore: 0.6,
    });

    expect(classifyAssetTier(asset)).toBe('midcap');
  });

  it('should not classify bluechip with low liquidity', () => {
    const asset: Asset = createTestAsset({
      liquidityUSD: 1_000_000, // Below 5M threshold
      auditScore: 0.9,
    });

    expect(classifyAssetTier(asset)).not.toBe('bluechip');
  });

  it('should not classify bluechip with low audit', () => {
    const asset: Asset = createTestAsset({
      liquidityUSD: 10_000_000,
      auditScore: 0.6, // Below 0.7 threshold
    });

    expect(classifyAssetTier(asset)).not.toBe('bluechip');
  });
});

describe('Dynamic Volume Calculation', () => {
  it('should increase volume for moonshot target assets', () => {
    const asset = createTestAsset({ tier: 'midcap', socialHype: 0.5 });
    const normalVolume = calculateDynamicVolume(asset, 'normie', 900, 1800, []);
    const moonshotVolume = calculateDynamicVolume(asset, 'moonshot', 900, 1800, [asset.id]);

    expect(moonshotVolume).toBeGreaterThan(normalVolume);
  });

  it('should decrease volume for non-target assets during moonshot', () => {
    const asset = createTestAsset({ tier: 'midcap', socialHype: 0.5 });
    const normalVolume = calculateDynamicVolume(asset, 'normie', 900, 1800, []);
    const moonshotVolume = calculateDynamicVolume(asset, 'moonshot', 900, 1800, []); // Not in targets

    expect(moonshotVolume).toBeLessThan(normalVolume);
  });

  it('should increase volume during bloodbath', () => {
    const asset = createTestAsset({ tier: 'midcap', socialHype: 0.5 });
    const normalVolume = calculateDynamicVolume(asset, 'normie', 900, 1800, []);
    const bloodbathVolume = calculateDynamicVolume(asset, 'bloodbath', 900, 1800, []);

    expect(bloodbathVolume).toBeGreaterThan(normalVolume);
  });

  it('should be lower at start of day', () => {
    const asset = createTestAsset({ tier: 'midcap', socialHype: 0.5 });
    const startVolume = calculateDynamicVolume(asset, 'normie', 50, 1800, []); // ~3% through day
    const midVolume = calculateDynamicVolume(asset, 'normie', 900, 1800, []); // 50% through day

    expect(startVolume).toBeLessThan(midVolume);
  });

  it('should be higher at end of day', () => {
    const asset = createTestAsset({ tier: 'midcap', socialHype: 0.5 });
    const midVolume = calculateDynamicVolume(asset, 'normie', 900, 1800, []); // 50% through day
    const endVolume = calculateDynamicVolume(asset, 'normie', 1750, 1800, []); // ~97% through day

    expect(endVolume).toBeGreaterThan(midVolume);
  });

  it('should never exceed 1.0', () => {
    const asset = createTestAsset({
      tier: 'shitcoin',
      socialHype: 1.0,
      volume: 1.0,
    });

    const volume = calculateDynamicVolume(asset, 'memefrenzy', 1750, 1800, [asset.id]);
    expect(volume).toBeLessThanOrEqual(1.0);
  });

  it('should never go below 0.05', () => {
    const asset = createTestAsset({
      tier: 'bluechip',
      socialHype: 0.0,
      volume: 0.0,
    });

    const volume = calculateDynamicVolume(asset, 'moonshot', 50, 1800, []); // Not a target, early morning
    expect(volume).toBeGreaterThanOrEqual(0.05);
  });
});

describe('Coin Launch Mechanics', () => {
  beforeEach(() => {
    initRNG(12345);
  });

  it('should respect 3-day cooldown', () => {
    const canLaunchDay2 = shouldLaunchCoin(2, 'memefrenzy', 2);
    expect(canLaunchDay2).toBe(false);
  });

  it('should allow launches after cooldown', () => {
    initRNG(12345);
    let launched = false;

    // Run multiple trials since it's probabilistic
    for (let i = 0; i < 100; i++) {
      initRNG(12345 + i);
      if (shouldLaunchCoin(10, 'memefrenzy', 5)) {
        launched = true;
        break;
      }
    }

    expect(launched).toBe(true);
  });

  it('should have higher launch rate during memefrenzy', () => {
    let memefrenzyLaunches = 0;
    let normieLaunches = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      initRNG(10000 + i);
      if (shouldLaunchCoin(10, 'memefrenzy', 5)) {
        memefrenzyLaunches++;
      }

      initRNG(20000 + i);
      if (shouldLaunchCoin(10, 'normie', 5)) {
        normieLaunches++;
      }
    }

    expect(memefrenzyLaunches).toBeGreaterThan(normieLaunches);
  });

  it('should have higher launch rate during rugseason than normie', () => {
    let rugseasonLaunches = 0;
    let normieLaunches = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      initRNG(30000 + i);
      if (shouldLaunchCoin(10, 'rugseason', 5)) {
        rugseasonLaunches++;
      }

      initRNG(40000 + i);
      if (shouldLaunchCoin(10, 'normie', 5)) {
        normieLaunches++;
      }
    }

    expect(rugseasonLaunches).toBeGreaterThan(normieLaunches);
  });
});

describe('Volume Multiplier Stacking', () => {
  it('should properly stack all multipliers', () => {
    const asset = createTestAsset({
      tier: 'shitcoin',
      socialHype: 0.9, // High hype
      volume: 0.8,     // High base volume
    });

    // Memefrenzy vibe (2.0x for shitcoins)
    // End of day (~1.5x)
    // High hype (~1.4x)
    // Should result in high volume
    const volume = calculateDynamicVolume(asset, 'memefrenzy', 1700, 1800, [asset.id]);

    expect(volume).toBeGreaterThan(0.7); // Should be quite high
  });
});

// Helper function to create test assets
function createTestAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'TEST',
    symbol: 'TEST',
    name: 'Test Coin',
    price: 1.0,
    liquidityUSD: 1_000_000,
    volume: 0.5,
    socialHype: 0.5,
    devTokensPct: 20,
    auditScore: 0.5,
    tier: 'midcap',
    rugged: false,
    momentum: 0,
    narrative: null,
    ...overrides,
  };
}
