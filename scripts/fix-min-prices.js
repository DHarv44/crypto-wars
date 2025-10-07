/**
 * Script to enforce minimum price of $0.00001 on all assets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIN_PRICE = 0.00001;

const assetsPath = path.join(__dirname, '../src/engine/assets.seed.json');
const assets = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));

let updatedCount = 0;

for (const asset of assets) {
  if (asset.basePrice < MIN_PRICE) {
    console.log(`${asset.symbol}: ${asset.basePrice.toExponential(2)} -> ${MIN_PRICE}`);
    asset.basePrice = MIN_PRICE;
    updatedCount++;
  }
}

fs.writeFileSync(assetsPath, JSON.stringify(assets, null, 2));

console.log(`\n✅ Updated ${updatedCount} assets to minimum price of $${MIN_PRICE}`);
console.log('All assets now have basePrice >= $0.00001');
