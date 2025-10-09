/**
 * Debug utilities for forcing specific game events
 * USE IN DEV MODE ONLY - DO NOT USE IN PRODUCTION
 */

import { useStore } from '../stores/rootStore';
import { generateNewCoin } from '../engine/coinLaunch';
import { applyRugInitial } from '../engine/pricing';
import type { MarketVibe } from '../engine/types';

/**
 * Debug utilities namespace - attach to window in dev mode
 */
export const DebugUtils = {
  /**
   * Force a rug pull on a specific asset
   * @param assetId - ID of the asset to rug
   */
  triggerRugPull(assetId: string) {
    const state = useStore.getState();
    const asset = state.assets[assetId];

    if (!asset) {
      console.error(`Asset ${assetId} not found`);
      return;
    }

    if (asset.tier === 'bluechip') {
      console.warn(`⚠️  Cannot rug bluechip asset ${assetId}`);
      return;
    }

    if (asset.rugged) {
      console.warn(`Asset ${assetId} is already rugged`);
      return;
    }

    console.log(`💀 Triggering rug pull on ${asset.symbol}...`);

    // Apply initial rug drop
    const { price, liquidity } = applyRugInitial(asset);

    state.updateAsset(assetId, {
      rugged: true,
      rugStartTick: state.tick,
      price,
      liquidityUSD: liquidity,
    });

    console.log(`💀 ${asset.symbol} rugged! Price: $${asset.price.toFixed(4)} → $${price.toFixed(4)}`);
  },

  /**
   * Force set the market vibe
   * @param vibe - Market vibe to set
   */
  setMarketVibe(vibe: MarketVibe) {
    const state = useStore.getState();
    const validVibes: MarketVibe[] = [
      'moonshot',
      'bloodbath',
      'memefrenzy',
      'rugseason',
      'whalewar',
      'normie',
    ];

    if (!validVibes.includes(vibe)) {
      console.error(`Invalid vibe. Must be one of: ${validVibes.join(', ')}`);
      return;
    }

    console.log(`🌍 Setting market vibe to: ${vibe}`);
    state.marketVibe = vibe;

    // Reselect targets for new vibe
    const targets = state.selectVibeTargets(vibe, state.assets);
    state.vibeTargetAssets = targets;

    console.log(`🎯 Vibe targets: ${targets.length > 0 ? targets.join(', ') : 'none'}`);
  },

  /**
   * Launch a new shitcoin immediately
   */
  launchNewCoin() {
    const state = useStore.getState();
    const newCoin = generateNewCoin(state.day);

    console.log(`🚀 Launching new coin: ${newCoin.symbol} (${newCoin.name})`);
    state.addAsset(newCoin);

    return newCoin;
  },

  /**
   * Advance N days instantly
   * @param days - Number of days to advance
   */
  async advanceDays(days: number) {
    const state = useStore.getState();
    console.log(`⏩ Advancing ${days} days...`);

    for (let i = 0; i < days; i++) {
      await state.advanceDay();
      console.log(`  Day ${state.day} complete`);
    }

    console.log(`✅ Advanced ${days} days. Current day: ${state.day}`);
  },

  /**
   * Set a specific asset's price
   * @param assetId - Asset ID
   * @param price - New price
   */
  setAssetPrice(assetId: string, price: number) {
    const state = useStore.getState();
    const asset = state.assets[assetId];

    if (!asset) {
      console.error(`Asset ${assetId} not found`);
      return;
    }

    console.log(`💰 Setting ${asset.symbol} price: $${asset.price.toFixed(4)} → $${price.toFixed(4)}`);
    state.updateAsset(assetId, { price });
  },

  /**
   * Set an asset's social hype
   * @param assetId - Asset ID
   * @param hype - Hype value (0-1)
   */
  setAssetHype(assetId: string, hype: number) {
    const state = useStore.getState();
    const asset = state.assets[assetId];

    if (!asset) {
      console.error(`Asset ${assetId} not found`);
      return;
    }

    const clampedHype = Math.max(0, Math.min(1, hype));
    console.log(`📢 Setting ${asset.symbol} hype: ${asset.socialHype.toFixed(2)} → ${clampedHype.toFixed(2)}`);
    state.updateAsset(assetId, { socialHype: clampedHype });
  },

  /**
   * Mark an asset as rug-warned
   * @param assetId - Asset ID
   */
  markAsRugWarned(assetId: string) {
    const state = useStore.getState();
    const asset = state.assets[assetId];

    if (!asset) {
      console.error(`Asset ${assetId} not found`);
      return;
    }

    if (asset.tier === 'bluechip') {
      console.warn(`⚠️  Bluechip assets cannot be rug-warned`);
      return;
    }

    console.log(`⚠️  Marking ${asset.symbol} as rug-warned`);
    state.updateAsset(assetId, { rugWarned: true });
  },

  /**
   * Print current game state summary
   */
  printState() {
    const state = useStore.getState();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           GAME STATE SUMMARY                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`📅 Day: ${state.day}`);
    console.log(`⏰ Tick: ${state.tick} / 1800`);
    console.log(`🌍 Market Vibe: ${state.marketVibe}`);
    console.log(`🎯 Vibe Targets: ${state.vibeTargetAssets?.join(', ') || 'none'}`);
    console.log(`💰 Cash: $${state.cash.toFixed(2)}`);
    console.log(`📊 Portfolio Value: $${state.portfolioValue.toFixed(2)}`);
    console.log(`\n📈 Assets (${Object.keys(state.assets).length}):`);

    for (const asset of Object.values(state.assets)) {
      const rugStatus = asset.rugged ? '💀' : asset.rugWarned ? '⚠️ ' : '  ';
      console.log(
        `  ${rugStatus} ${asset.symbol.padEnd(6)} $${asset.price.toFixed(4).padStart(10)} | ` +
        `${asset.tier.padEnd(9)} | Hype: ${asset.socialHype.toFixed(2)} | ` +
        `Liq: $${(asset.liquidityUSD / 1000000).toFixed(1)}M`
      );
    }

    console.log(`\n📰 News Articles: ${state.articles.length}`);
    console.log(`🎒 Holdings: ${Object.keys(state.holdings).length} positions\n`);
  },

  /**
   * List all available assets
   */
  listAssets() {
    const state = useStore.getState();
    const assets = Object.values(state.assets);

    console.log('\n📊 Available Assets:\n');

    for (const asset of assets) {
      console.log(`  ${asset.id.padEnd(8)} - ${asset.symbol.padEnd(6)} (${asset.tier})`);
    }

    console.log('');
  },

  /**
   * Reset the game to initial state
   */
  reset() {
    if (confirm('⚠️  Reset game to initial state? This cannot be undone.')) {
      const state = useStore.getState();
      state.resetGame();
      console.log('✅ Game reset to initial state');
    }
  },

  /**
   * Print help information
   */
  help() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           DEBUG UTILITIES - HELP                           ║
╚════════════════════════════════════════════════════════════╝

Available Commands:

  debug.triggerRugPull(assetId)
    Force a rug pull on a specific asset
    Example: debug.triggerRugPull('DOGE')

  debug.setMarketVibe(vibe)
    Force set the market vibe
    Vibes: moonshot, bloodbath, memefrenzy, rugseason, whalewar, normie
    Example: debug.setMarketVibe('memefrenzy')

  debug.launchNewCoin()
    Launch a new shitcoin immediately
    Example: debug.launchNewCoin()

  debug.advanceDays(days)
    Advance N days instantly
    Example: debug.advanceDays(5)

  debug.setAssetPrice(assetId, price)
    Set a specific asset's price
    Example: debug.setAssetPrice('BTC', 100000)

  debug.setAssetHype(assetId, hype)
    Set an asset's social hype (0-1)
    Example: debug.setAssetHype('DOGE', 0.95)

  debug.markAsRugWarned(assetId)
    Mark an asset as rug-warned
    Example: debug.markAsRugWarned('SHIB')

  debug.printState()
    Print current game state summary
    Example: debug.printState()

  debug.listAssets()
    List all available assets
    Example: debug.listAssets()

  debug.reset()
    Reset game to initial state
    Example: debug.reset()

  debug.help()
    Show this help message
    Example: debug.help()

Usage:
  Open browser console and type: debug.<command>

    `);
  },
};

/**
 * Attach debug utils to window in dev mode
 */
export function initDebugUtils() {
  if (import.meta.env.DEV) {
    (window as any).debug = DebugUtils;
    console.log(
      '%c🎮 Crypto Wars Debug Mode Enabled',
      'font-size: 16px; font-weight: bold; color: #00ff00; background: #000; padding: 8px;'
    );
    console.log(
      '%cType debug.help() for available commands',
      'font-size: 12px; color: #00aaff;'
    );
  }
}
