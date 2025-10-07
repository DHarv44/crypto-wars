/**
 * Script to add launchedDaysAgo field to all assets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsPath = path.join(__dirname, '../src/engine/assets.seed.json');
const assets = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));

// Define launch dates based on tier and symbol
const launchDates = {
  // Core coins - established cryptocurrencies (1825 days = 5 years)
  'BTC': 1825,
  'ETH': 1825,
  'DOGE': 1460, // ~4 years
  'SOL': 1095, // ~3 years
  'BNB': 1460,
  'ADA': 1460,
  'XRP': 1825,
  'MATIC': 730, // ~2 years
  'LINK': 1095,
  'AVAX': 730,

  // Base tier - established meme coins (180-365 days)
  'SHIB': 365,
  'PEPE': 180,
  'FLOKI': 270,
  'BABYDOGE': 210,
  'USDT': 1825, // Tether is old

  // Unlockable - newer meme coins (30-120 days)
  // Default to range based on pattern
};

// Update each asset
for (const asset of assets) {
  if (!asset.launchedDaysAgo) {
    if (launchDates[asset.symbol]) {
      // Use specific date
      asset.launchedDaysAgo = launchDates[asset.symbol];
    } else if (asset.tier === 'core') {
      // Core coins default to 2-3 years
      asset.launchedDaysAgo = 730 + Math.floor(Math.random() * 365);
    } else if (asset.tier === 'base') {
      // Base tier: 6 months to 1 year
      asset.launchedDaysAgo = 180 + Math.floor(Math.random() * 185);
    } else if (asset.tier === 'unlockable') {
      // Unlockable: 1-4 months (newer meme coins)
      asset.launchedDaysAgo = 30 + Math.floor(Math.random() * 90);
    }
  }
}

// Write back to file
fs.writeFileSync(assetsPath, JSON.stringify(assets, null, 2));

console.log('✅ Added launchedDaysAgo to all assets');
console.log('Sample:');
console.log(assets.slice(0, 5).map(a => `${a.symbol}: ${a.launchedDaysAgo} days`).join('\n'));
