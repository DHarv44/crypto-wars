import { Offer, PlayerState, Asset } from './types';
import { getRNG } from './rng';

let offerIdCounter = 0;

function generateOfferId(): string {
  return `offer_${Date.now()}_${offerIdCounter++}`;
}

/**
 * Generate a government bump offer
 * Buys 20-60% of player's position at 2-3× price or grants fiat
 */
export function generateGovBumpOffer(
  tick: number,
  player: PlayerState,
  assets: Record<string, Asset>
): Offer | null {
  const rng = getRNG();

  // Find player's largest holding
  const holdings = Object.entries(player.holdings).filter(([_, units]) => units > 0);
  if (holdings.length === 0) return null;

  holdings.sort((a, b) => b[1] - a[1]);
  const [assetId, units] = holdings[0];
  const asset = assets[assetId];
  if (!asset) return null;

  const buyPct = rng.range(0.2, 0.6);
  const priceMultiplier = rng.range(2, 3);
  const unitsToBuy = units * buyPct;
  const benefit = unitsToBuy * asset.price * priceMultiplier;
  const scrutinyIncrease = rng.range(10, 25);

  return {
    id: generateOfferId(),
    type: 'gov_bump',
    assetId,
    description: `Government wants to acquire ${(buyPct * 100).toFixed(0)}% of your ${asset.symbol} position`,
    action: `Sell ${unitsToBuy.toFixed(2)} ${asset.symbol} @ ${priceMultiplier.toFixed(1)}× market price`,
    cost: 0,
    benefit,
    consequence: `+${scrutinyIncrease.toFixed(0)} Scrutiny`,
    expiresAtTick: tick + 5,
  };
}

/**
 * Generate a whale OTC offer
 * Large off-exchange trade with premium or discount
 */
export function generateWhaleOTCOffer(
  tick: number,
  player: PlayerState,
  assets: Record<string, Asset>
): Offer | null {
  const rng = getRNG();

  // Pick a random asset from market
  const assetList = Object.values(assets).filter((a) => !a.rugged && a.liquidityUSD > 100_000);
  if (assetList.length === 0) return null;

  const asset = rng.pick(assetList);
  const isBuy = rng.chance(0.5);
  const volume = rng.range(1000, 10000);
  const priceMultiplier = isBuy ? rng.range(0.85, 0.95) : rng.range(1.05, 1.2);

  if (isBuy) {
    // Whale wants to sell to player at discount
    const cost = volume * priceMultiplier;
    const benefit = volume / asset.price; // units gained

    return {
      id: generateOfferId(),
      type: 'whale_otc',
      assetId: asset.id,
      description: `Whale offering ${benefit.toFixed(2)} ${asset.symbol} at ${((1 - priceMultiplier) * 100).toFixed(0)}% discount`,
      action: `Buy OTC for $${cost.toFixed(0)}`,
      cost,
      benefit,
      expiresAtTick: tick + 3,
    };
  } else {
    // Whale wants to buy from player at premium
    const playerUnits = player.holdings[asset.id] || 0;
    if (playerUnits === 0) return null;

    const unitsToBuy = Math.min(playerUnits * 0.5, volume / asset.price);
    const benefit = unitsToBuy * asset.price * priceMultiplier;

    return {
      id: generateOfferId(),
      type: 'whale_otc',
      assetId: asset.id,
      description: `Whale wants to buy ${unitsToBuy.toFixed(2)} ${asset.symbol} at ${((priceMultiplier - 1) * 100).toFixed(0)}% premium`,
      action: `Sell OTC for $${benefit.toFixed(0)}`,
      cost: 0,
      benefit,
      expiresAtTick: tick + 3,
    };
  }
}

/**
 * Accept a government bump offer
 */
export function acceptGovBump(
  offer: Offer,
  player: PlayerState,
  asset: Asset
): { playerUpdates: Partial<PlayerState>; message: string } {
  const rng = getRNG();
  const scrutinyIncrease = rng.range(10, 25);

  // Calculate units to sell (already computed in benefit)
  const currentUnits = player.holdings[offer.assetId!] || 0;
  const sellPct = rng.range(0.2, 0.6);
  const unitsToSell = currentUnits * sellPct;

  return {
    playerUpdates: {
      cashUSD: player.cashUSD + offer.benefit,
      holdings: {
        ...player.holdings,
        [offer.assetId!]: currentUnits - unitsToSell,
      },
      scrutiny: player.scrutiny + scrutinyIncrease,
    },
    message: `Sold ${unitsToSell.toFixed(2)} ${asset.symbol} to government for $${offer.benefit.toFixed(0)} (+${scrutinyIncrease} scrutiny)`,
  };
}

/**
 * Accept a whale OTC offer
 */
export function acceptWhaleOTC(
  offer: Offer,
  player: PlayerState
): { playerUpdates: Partial<PlayerState>; message: string } {
  if (offer.cost > 0) {
    // Buying from whale
    return {
      playerUpdates: {
        cashUSD: player.cashUSD - offer.cost,
        holdings: {
          ...player.holdings,
          [offer.assetId!]: (player.holdings[offer.assetId!] || 0) + offer.benefit,
        },
      },
      message: `Bought ${offer.benefit.toFixed(2)} units OTC for $${offer.cost.toFixed(0)}`,
    };
  } else {
    // Selling to whale
    const currentUnits = player.holdings[offer.assetId!] || 0;
    const unitsToSell = offer.benefit / (offer.benefit / currentUnits); // Reverse calc

    return {
      playerUpdates: {
        cashUSD: player.cashUSD + offer.benefit,
        holdings: {
          ...player.holdings,
          [offer.assetId!]: currentUnits - unitsToSell,
        },
      },
      message: `Sold OTC for $${offer.benefit.toFixed(0)}`,
    };
  }
}
