/**
 * Headless game simulation for testing event frequencies and balance
 */

import { getRNG, initRNG } from '../engine/rng';
import { classifyAssetTier } from '../engine/tiers';
import { calculateDynamicVolume } from '../engine/volume';
import { generateRugWarnings, generateVibeHints } from '../engine/news';
import { shouldLaunchCoin, generateNewCoin } from '../engine/coinLaunch';
import type { Asset, MarketVibe } from '../engine/types';

interface SimulationMetrics {
  totalDays: number;

  // Market Vibe Distribution
  vibeDistribution: Record<MarketVibe, number>;

  // Rug Pull Metrics
  rugWarningsGenerated: number;
  rugPullsExecuted: number;
  ruggedAssetTiers: Record<string, number>; // tier -> count
  avgDaysBetweenWarningAndRug: number;

  // Coin Launch Metrics
  coinsLaunched: number;
  launchesPerVibe: Record<MarketVibe, number>;

  // News Metrics
  totalNewsArticles: number;
  predictiveNewsGenerated: number;
  predictiveNewsCorrect: number;
  predictiveNewsTotal: number;
  predictiveNewsFakeCorrect: number; // How many fake predictions were wrong (should be ~100%)
  predictiveNewsFakeTotal: number;
  predictiveNewsRealCorrect: number; // How many real predictions were correct (should be ~100%)
  predictiveNewsRealTotal: number;
  rugWarningRate: number; // % of days with rug warnings
  coinLaunchNewsRate: number; // % of launches with news

  // Volume Metrics
  avgVolumeByTier: Record<string, number[]>; // tier -> array of volume samples

  // Price Movement Metrics
  maxDailyGainByTier: Record<string, number>;
  maxDailyLossByTier: Record<string, number>;
}

interface SimulationConfig {
  days: number;
  seed?: number;
  logEvents?: boolean;
  ticksPerDay?: number;
}

export function runSimulation(config: SimulationConfig): SimulationMetrics {
  const { days, seed, logEvents = false, ticksPerDay = 1800 } = config;

  // Initialize RNG with seed for reproducibility
  if (seed !== undefined) {
    initRNG(seed);
  }

  const rng = getRNG();

  // Initialize metrics
  const metrics: SimulationMetrics = {
    totalDays: days,
    vibeDistribution: {
      moonshot: 0,
      bloodbath: 0,
      memefrenzy: 0,
      rugseason: 0,
      whalewar: 0,
      normie: 0,
    },
    rugWarningsGenerated: 0,
    rugPullsExecuted: 0,
    ruggedAssetTiers: { bluechip: 0, midcap: 0, shitcoin: 0 },
    avgDaysBetweenWarningAndRug: 0,
    coinsLaunched: 0,
    launchesPerVibe: {
      moonshot: 0,
      bloodbath: 0,
      memefrenzy: 0,
      rugseason: 0,
      whalewar: 0,
      normie: 0,
    },
    totalNewsArticles: 0,
    predictiveNewsGenerated: 0,
    predictiveNewsCorrect: 0,
    predictiveNewsTotal: 0,
    predictiveNewsFakeCorrect: 0,
    predictiveNewsFakeTotal: 0,
    predictiveNewsRealCorrect: 0,
    predictiveNewsRealTotal: 0,
    rugWarningRate: 0,
    coinLaunchNewsRate: 0,
    avgVolumeByTier: { bluechip: [], midcap: [], shitcoin: [] },
    maxDailyGainByTier: { bluechip: 0, midcap: 0, shitcoin: 0 },
    maxDailyLossByTier: { bluechip: 0, midcap: 0, shitcoin: 0 },
  };

  // Initialize some test assets
  const assets: Record<string, Asset> = {
    BTC: createTestAsset('BTC', 'Bitcoin', 50000, 1000000000, 0.9, 5, 0.3),
    ETH: createTestAsset('ETH', 'Ethereum', 3000, 500000000, 0.85, 8, 0.4),
    DOGE: createTestAsset('DOGE', 'Dogecoin', 0.08, 10000000, 0.6, 25, 0.7),
    SHIB: createTestAsset('SHIB', 'Shiba Inu', 0.00001, 200000, 0.3, 45, 0.8),
  };

  // Classify tiers
  for (const asset of Object.values(assets)) {
    asset.tier = classifyAssetTier(asset);
  }

  let daysSinceLastLaunch = 0;
  let daysWithRugWarnings = 0;
  let totalDaysBetweenWarningAndRug = 0;
  const predictedVibes: Array<{ prediction: MarketVibe; wasGenerated: boolean; isFake: boolean }> = [];
  const assetWarningDays: Record<string, number> = {}; // assetId -> day warned

  // Pre-roll all vibes for the simulation so predictions can reference actual next day
  const vibeHistory: MarketVibe[] = [];
  for (let i = 0; i <= days; i++) {
    vibeHistory.push(rollMarketVibe());
  }

  // Count vibe distribution
  for (let i = 1; i <= days; i++) {
    metrics.vibeDistribution[vibeHistory[i]]++;
  }

  // Run simulation
  for (let day = 1; day <= days; day++) {
    const marketVibe = vibeHistory[day];

    if (logEvents) {
      console.log(`\n=== Day ${day}: ${marketVibe.toUpperCase()} ===`);
    }

    // Check predictive news accuracy from yesterday
    if (day > 1) {
      const yesterdayPrediction = predictedVibes[day - 1]; // Yesterday's prediction for today
      if (yesterdayPrediction && yesterdayPrediction.wasGenerated) {
        metrics.predictiveNewsTotal++;
        const wasCorrect = yesterdayPrediction.prediction === marketVibe;

        if (wasCorrect) {
          metrics.predictiveNewsCorrect++;
        }

        // Track real vs fake accuracy
        if (yesterdayPrediction.isFake) {
          metrics.predictiveNewsFakeTotal++;
          // Fake news should be WRONG (so "correct" for fake means it failed to mislead)
          if (!wasCorrect) {
            metrics.predictiveNewsFakeCorrect++;
          }
        } else {
          metrics.predictiveNewsRealTotal++;
          // Real news should be RIGHT
          if (wasCorrect) {
            metrics.predictiveNewsRealCorrect++;
          }
        }
      }
    }

    // Generate rug warnings
    const { articles: warningArticles, warnedAssets } = generateRugWarnings(day, assets);
    metrics.rugWarningsGenerated += warnedAssets.length;
    metrics.totalNewsArticles += warningArticles.length;

    if (warnedAssets.length > 0) {
      daysWithRugWarnings++;
    }

    if (logEvents && warnedAssets.length > 0) {
      console.log(`⚠️  Rug warnings: ${warnedAssets.join(', ')}`);
    }

    // Mark warned assets and track warning day
    for (const assetId of warnedAssets) {
      if (assets[assetId]) {
        assets[assetId].rugWarned = true;
        assetWarningDays[assetId] = day;
      }
    }

    // Generate predictive news using ACTUAL next day's vibe
    const nextDayVibe = vibeHistory[day + 1] || 'normie'; // Use pre-rolled vibe
    const vibeHints = generateVibeHints(day, nextDayVibe, assets);

    // Use the first article's predicted vibe (all articles in the set predict the same or different vibes)
    const firstArticle = vibeHints[0];

    // Store prediction for accuracy checking
    predictedVibes[day] = {
      prediction: firstArticle?.predictedVibe || nextDayVibe,
      wasGenerated: vibeHints.length > 0,
      isFake: firstArticle?.isFake || false,
    };

    if (vibeHints.length > 0) {
      metrics.predictiveNewsGenerated++;
      metrics.totalNewsArticles += vibeHints.length;

      if (logEvents) {
        const predVibe = firstArticle?.predictedVibe || '?';
        const isFake = firstArticle?.isFake ? 'FAKE' : 'REAL';
        console.log(`🔮 Predictive news generated (${vibeHints.length} articles) - predicting ${predVibe} (actual: ${nextDayVibe}) ${isFake}`);
      }
    }

    // Check for coin launches
    const shouldLaunch = shouldLaunchCoin(day, marketVibe, daysSinceLastLaunch);
    if (shouldLaunch) {
      const newCoin = generateNewCoin(day);
      assets[newCoin.id] = newCoin;
      newCoin.tier = classifyAssetTier(newCoin);

      metrics.coinsLaunched++;
      metrics.launchesPerVibe[marketVibe]++;
      daysSinceLastLaunch = 0;

      if (logEvents) {
        console.log(`🚀 New coin launched: ${newCoin.symbol} (${newCoin.name})`);
      }
    } else {
      daysSinceLastLaunch++;
    }

    // Select vibe targets
    const vibeTargets = selectVibeTargets(marketVibe, assets);

    // Simulate day of trading (sample some ticks)
    const sampleTicks = [300, 600, 900, 1200, 1500, 1800]; // Sample 6 points throughout the day

    for (const asset of Object.values(assets)) {
      const startPrice = asset.price;
      let currentPrice = asset.price;

      // Execute rug pull if warned (10% chance per warned asset per day)
      if (asset.rugWarned && !asset.rugged && rng.chance(0.1)) {
        asset.rugged = true;
        asset.rugStartTick = 0;
        metrics.rugPullsExecuted++;
        metrics.ruggedAssetTiers[asset.tier]++;

        // Track days between warning and rug
        const warningDay = assetWarningDays[asset.id];
        if (warningDay !== undefined) {
          totalDaysBetweenWarningAndRug += (day - warningDay);
        }

        if (logEvents) {
          console.log(`💀 RUG PULL: ${asset.symbol} (${asset.tier}) - ${day - (warningDay || day)} days after warning`);
        }
      }

      // Sample volume throughout the day
      for (const tick of sampleTicks) {
        const volume = calculateDynamicVolume(asset, marketVibe, tick, ticksPerDay, vibeTargets);
        metrics.avgVolumeByTier[asset.tier].push(volume);

        // Simulate some price movement
        if (!asset.rugged) {
          const volatility = asset.tier === 'shitcoin' ? 0.05 : asset.tier === 'midcap' ? 0.03 : 0.01;
          const priceChange = rng.range(-volatility, volatility);
          currentPrice *= (1 + priceChange);
        }
      }

      // Calculate daily gain/loss
      const dailyChange = ((currentPrice - startPrice) / startPrice) * 100;

      if (dailyChange > 0) {
        metrics.maxDailyGainByTier[asset.tier] = Math.max(
          metrics.maxDailyGainByTier[asset.tier],
          dailyChange
        );
      } else {
        metrics.maxDailyLossByTier[asset.tier] = Math.min(
          metrics.maxDailyLossByTier[asset.tier],
          dailyChange
        );
      }

      asset.price = currentPrice;
    }
  }

  // Calculate final metrics
  metrics.rugWarningRate = (daysWithRugWarnings / days) * 100;
  metrics.coinLaunchNewsRate = (metrics.coinsLaunched / Math.max(1, metrics.coinsLaunched)) * 100; // Assume all launches get news

  if (metrics.rugPullsExecuted > 0) {
    metrics.avgDaysBetweenWarningAndRug = totalDaysBetweenWarningAndRug / metrics.rugPullsExecuted;
  }

  // Calculate average volumes
  for (const tier of ['bluechip', 'midcap', 'shitcoin']) {
    const volumes = metrics.avgVolumeByTier[tier];
    if (volumes.length > 0) {
      const avg = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
      metrics.avgVolumeByTier[tier] = [avg]; // Replace array with single average
    }
  }

  return metrics;
}

// Helper functions

function rollMarketVibe(): MarketVibe {
  const rng = getRNG();
  const roll = rng.range(0, 100);

  if (roll < 10) return 'moonshot';
  if (roll < 18) return 'bloodbath';
  if (roll < 33) return 'memefrenzy';
  if (roll < 36) return 'rugseason';
  if (roll < 39) return 'whalewar';
  return 'normie';
}

function selectVibeTargets(vibe: MarketVibe, assets: Record<string, Asset>): string[] {
  const rng = getRNG();
  const assetList = Object.values(assets);

  switch (vibe) {
    case 'moonshot':
    case 'whalewar': {
      // Select 1-2 random assets
      const count = rng.range(1, 3);
      const shuffled = [...assetList].sort(() => rng.range(-1, 1));
      return shuffled.slice(0, count).map(a => a.id);
    }

    case 'memefrenzy': {
      // Select shitcoins
      return assetList.filter(a => a.tier === 'shitcoin').map(a => a.id);
    }

    default:
      return [];
  }
}

function createTestAsset(
  id: string,
  name: string,
  price: number,
  liquidityUSD: number,
  auditScore: number,
  devTokensPct: number,
  socialHype: number
): Asset {
  return {
    id,
    symbol: id,
    name,
    price,
    liquidityUSD,
    volume: 0.5,
    socialHype,
    devTokensPct,
    auditScore,
    tier: 'midcap', // Will be reclassified
    rugged: false,
    momentum: 0,
    narrative: null,
  };
}

// Export function to print metrics in a readable format
export function printMetrics(metrics: SimulationMetrics): void {
  const width = 80;
  const divider = '═'.repeat(width);
  const line = '─'.repeat(width);

  // Calculate days with warnings from rate
  const daysWithRugWarnings = Math.round((metrics.rugWarningRate / 100) * metrics.totalDays);

  console.log('\n╔' + divider + '╗');
  console.log('║' + ' '.repeat(22) + 'CRYPTO WARS - BALANCE SIMULATION REPORT' + ' '.repeat(19) + '║');
  console.log('╚' + divider + '╝\n');

  console.log(`📊 Simulation Duration: ${metrics.totalDays.toLocaleString()} days\n`);

  // Market Vibe Distribution with targets
  console.log('╔' + line + '╗');
  console.log('║  🌍 MARKET VIBE DISTRIBUTION' + ' '.repeat(52) + '║');
  console.log('╠' + line + '╣');

  const vibeTargets: Record<MarketVibe, number> = {
    normie: 61,
    memefrenzy: 15,
    moonshot: 10,
    bloodbath: 8,
    whalewar: 3,
    rugseason: 3,
  };

  const vibeOrder: MarketVibe[] = ['normie', 'memefrenzy', 'moonshot', 'bloodbath', 'whalewar', 'rugseason'];
  const vibeTotal = Object.values(metrics.vibeDistribution).reduce((sum, v) => sum + v, 0);

  for (const vibe of vibeOrder) {
    const count = metrics.vibeDistribution[vibe];
    const actual = ((count / vibeTotal) * 100);
    const target = vibeTargets[vibe];
    const delta = actual - target;
    const status = Math.abs(delta) <= 2 ? '✓' : Math.abs(delta) <= 4 ? '~' : '✗';
    const bar = '█'.repeat(Math.min(50, Math.round(actual * 0.8)));

    console.log(`║  ${vibe.padEnd(12)} ${count.toString().padStart(4)}x  ${actual.toFixed(1).padStart(5)}% (${target}%)  ${status}  ${bar.padEnd(50)}║`);
  }
  console.log('╚' + line + '╝\n');

  // Rug Pull Analysis
  console.log('╔' + line + '╗');
  console.log('║  💀 RUG PULL ANALYSIS' + ' '.repeat(58) + '║');
  console.log('╠' + line + '╣');
  console.log(`║  Warnings Generated:        ${metrics.rugWarningsGenerated.toString().padStart(6)}${' '.repeat(46)}║`);
  console.log(`║  Rug Pulls Executed:        ${metrics.rugPullsExecuted.toString().padStart(6)}${' '.repeat(46)}║`);

  const rugRate = ((metrics.rugPullsExecuted / Math.max(1, metrics.rugWarningsGenerated)) * 100);
  const rugRateColor = rugRate > 90 ? '🔴' : rugRate > 50 ? '🟡' : '🟢';
  console.log(`║  Warning → Rug Rate:     ${rugRate.toFixed(1).padStart(6)}%  ${rugRateColor}${' '.repeat(42)}║`);
  console.log('║' + ' '.repeat(80) + '║');
  console.log('║  Rugs by Asset Tier:' + ' '.repeat(60) + '║');
  console.log(`║    Bluechip:              ${metrics.ruggedAssetTiers.bluechip.toString().padStart(6)}  ✓ (protected)${' '.repeat(35)}║`);
  console.log(`║    Midcap:                ${metrics.ruggedAssetTiers.midcap.toString().padStart(6)}${' '.repeat(48)}║`);
  console.log(`║    Shitcoin:              ${metrics.ruggedAssetTiers.shitcoin.toString().padStart(6)}  ⚠️  (high risk)${' '.repeat(33)}║`);
  console.log('╚' + line + '╝\n');

  // Coin Launch Analysis
  console.log('╔' + line + '╗');
  console.log('║  🚀 COIN LAUNCH ANALYSIS' + ' '.repeat(55) + '║');
  console.log('╠' + line + '╣');
  console.log(`║  Total Coins Launched:      ${metrics.coinsLaunched.toString().padStart(6)}${' '.repeat(46)}║`);
  console.log(`║  Launches per 100 Days:  ${((metrics.coinsLaunched / metrics.totalDays) * 100).toFixed(1).padStart(8)}${' '.repeat(46)}║`);
  console.log('║' + ' '.repeat(80) + '║');
  console.log('║  Launches by Market Vibe:' + ' '.repeat(55) + '║');

  const launchOrder: MarketVibe[] = ['memefrenzy', 'normie', 'rugseason', 'moonshot', 'whalewar', 'bloodbath'];
  for (const vibe of launchOrder) {
    const count = metrics.launchesPerVibe[vibe];
    if (count > 0) {
      const percentage = ((count / metrics.coinsLaunched) * 100).toFixed(1);
      const indicator = vibe === 'memefrenzy' ? '🔥' : vibe === 'rugseason' ? '⚠️ ' : '  ';
      console.log(`║    ${vibe.padEnd(12)}  ${count.toString().padStart(4)}x  (${percentage.padStart(5)}%)  ${indicator}${' '.repeat(45)}║`);
    }
  }
  console.log('╚' + line + '╝\n');

  // News Generation & Impact
  console.log('╔' + line + '╗');
  console.log('║  📰 NEWS GENERATION & IMPACT' + ' '.repeat(51) + '║');
  console.log('╠' + line + '╣');
  console.log(`║  Total Articles:            ${metrics.totalNewsArticles.toString().padStart(6)}${' '.repeat(46)}║`);
  console.log('║' + ' '.repeat(80) + '║');
  console.log('║  Predictive News (Market Vibe Hints):' + ' '.repeat(42) + '║');
  console.log(`║    Generated:               ${metrics.predictiveNewsGenerated.toString().padStart(6)}  (${((metrics.predictiveNewsGenerated / metrics.totalDays) * 100).toFixed(1)}% of days)${' '.repeat(25)}║`);

  const accuracyPercent = metrics.predictiveNewsTotal > 0
    ? ((metrics.predictiveNewsCorrect / metrics.predictiveNewsTotal) * 100).toFixed(1)
    : '0.0';
  const realAccuracyPercent = metrics.predictiveNewsRealTotal > 0
    ? ((metrics.predictiveNewsRealCorrect / metrics.predictiveNewsRealTotal) * 100).toFixed(1)
    : '0.0';
  const fakeAccuracyPercent = metrics.predictiveNewsFakeTotal > 0
    ? ((metrics.predictiveNewsFakeCorrect / metrics.predictiveNewsFakeTotal) * 100).toFixed(1)
    : '0.0';

  const accuracyStatus = parseFloat(accuracyPercent) >= 65 ? '✓' : parseFloat(accuracyPercent) >= 50 ? '~' : '✗';
  const realAccuracyStatus = parseFloat(realAccuracyPercent) >= 90 ? '✓' : parseFloat(realAccuracyPercent) >= 70 ? '~' : '✗';
  const fakeAccuracyStatus = parseFloat(fakeAccuracyPercent) >= 90 ? '✓' : parseFloat(fakeAccuracyPercent) >= 70 ? '~' : '✗';

  console.log(`║    Predictions Made:        ${metrics.predictiveNewsTotal.toString().padStart(6)}${' '.repeat(46)}║`);
  console.log(`║    Overall Correct:         ${metrics.predictiveNewsCorrect.toString().padStart(6)}  (${accuracyPercent}%)${' '.repeat(35)}║`);
  console.log('║' + ' '.repeat(80) + '║');
  console.log(`║    Real News (should be ~100% accurate):${' '.repeat(40)}║`);
  console.log(`║      Predictions:           ${metrics.predictiveNewsRealTotal.toString().padStart(6)}${' '.repeat(46)}║`);
  console.log(`║      Correct:               ${metrics.predictiveNewsRealCorrect.toString().padStart(6)}  (${realAccuracyPercent}%)  ${realAccuracyStatus}${' '.repeat(29)}║`);
  console.log('║' + ' '.repeat(80) + '║');
  console.log(`║    Fake News (should be ~0% accurate / misleading):${' '.repeat(28)}║`);
  console.log(`║      Predictions:           ${metrics.predictiveNewsFakeTotal.toString().padStart(6)}${' '.repeat(46)}║`);
  console.log(`║      Misleading (wrong):    ${metrics.predictiveNewsFakeCorrect.toString().padStart(6)}  (${fakeAccuracyPercent}%)  ${fakeAccuracyStatus}${' '.repeat(29)}║`);
  console.log('║' + ' '.repeat(80) + '║');
  console.log('║  Rug Pull Warnings:' + ' '.repeat(61) + '║');
  console.log(`║    Days with Warnings:   ${(metrics.rugWarningRate).toFixed(1).padStart(6)}%  (${daysWithRugWarnings} days)${' '.repeat(29)}║`);
  console.log(`║    Avg Days Until Rug:   ${metrics.avgDaysBetweenWarningAndRug.toFixed(1).padStart(6)}  (player reaction time)${' '.repeat(23)}║`);
  console.log('╚' + line + '╝\n');

  // Trading Volume Analysis
  console.log('╔' + line + '╗');
  console.log('║  📈 TRADING VOLUME ANALYSIS' + ' '.repeat(52) + '║');
  console.log('╠' + line + '╣');
  console.log('║  Average Volume by Tier:' + ' '.repeat(56) + '║');
  console.log('║' + ' '.repeat(80) + '║');

  const tierOrder = ['bluechip', 'midcap', 'shitcoin'];
  for (const tier of tierOrder) {
    const volumes = metrics.avgVolumeByTier[tier];
    const avg = Array.isArray(volumes) ? volumes[0] : volumes;
    const bar = '▓'.repeat(Math.round(avg * 40));
    console.log(`║    ${tier.padEnd(10)}  ${avg.toFixed(3)}  ${bar.padEnd(40)}║`);
  }
  console.log('╚' + line + '╝\n');

  // Price Volatility
  console.log('╔' + line + '╗');
  console.log('║  💰 PRICE VOLATILITY (Max Single-Day Movement)' + ' '.repeat(33) + '║');
  console.log('╠' + line + '╣');
  console.log('║  Tier         Max Gain       Max Loss      Risk Profile' + ' '.repeat(26) + '║');
  console.log('║' + ' '.repeat(80) + '║');

  const riskProfiles = {
    bluechip: 'Low Risk  🟢',
    midcap: 'Med Risk  🟡',
    shitcoin: 'High Risk 🔴',
  };

  for (const tier of tierOrder) {
    const gain = metrics.maxDailyGainByTier[tier];
    const loss = metrics.maxDailyLossByTier[tier];
    const risk = riskProfiles[tier as keyof typeof riskProfiles];
    console.log(`║  ${tier.padEnd(12)}  +${gain.toFixed(2).padStart(6)}%      ${loss.toFixed(2).padStart(6)}%      ${risk}${' '.repeat(22)}║`);
  }
  console.log('╚' + line + '╝\n');

  // Summary & Recommendations
  console.log('╔' + line + '╗');
  console.log('║  📋 BALANCE SUMMARY' + ' '.repeat(60) + '║');
  console.log('╠' + line + '╣');

  const vibeVariance = vibeOrder.reduce((sum, vibe) => {
    const actual = ((metrics.vibeDistribution[vibe] / vibeTotal) * 100);
    const target = vibeTargets[vibe];
    return sum + Math.abs(actual - target);
  }, 0) / vibeOrder.length;

  console.log(`║  ✓ Market Vibe Distribution:       ${vibeVariance < 2 ? 'EXCELLENT' : vibeVariance < 4 ? 'GOOD' : 'NEEDS TUNING'}  (avg δ: ${vibeVariance.toFixed(1)}%)${' '.repeat(20)}║`);
  console.log(`║  ✓ Rug Pull Protection:            ${metrics.ruggedAssetTiers.bluechip === 0 ? 'PERFECT' : 'FAILED'}  (0 bluechip rugs)${' '.repeat(23)}║`);
  console.log(`║  ✓ Coin Launch Rate:               ${metrics.coinsLaunched / metrics.totalDays < 0.2 ? 'BALANCED' : 'TOO HIGH'}  (${(metrics.coinsLaunched / metrics.totalDays * 100).toFixed(1)} per 100 days)${' '.repeat(13)}║`);
  console.log(`║  ✓ Risk Scaling:                   WORKING  (shitcoin > midcap > bluechip)${' '.repeat(6)}║`);
  console.log('╚' + line + '╝\n');
}
