import { Asset, PlayerState, PriceCandle, Operation, Offer } from './types';
import { updatePrice } from './pricing';
import { processTickEvents, EventResult } from './events';
import { decayAuditScore } from './risk';
import { getRNG } from './rng';
import { generateGovBumpOffer, generateWhaleOTCOffer } from './offers';

export interface TickResult {
  assetUpdates: Record<string, Partial<Asset>>;
  playerUpdates: Partial<PlayerState>;
  events: EventResult['events'];
  newOffers?: Offer[];
}

/**
 * Execute a single tick: update prices, process events, decay stats
 */
export function executeTick(
  tick: number,
  assets: Record<string, Asset>,
  player: PlayerState,
  devMode: boolean,
  activeOps: Operation[] = []
): TickResult {
  const assetUpdates: Record<string, Partial<Asset>> = {};

  // Note: Price updates are handled by processTick() (intra-day)
  // executeTick only handles daily events, news, offers, etc.

  // 1. Process active operations
  const rng = getRNG();
  const operationEvents: EventResult['events'] = [];

  for (const op of activeOps) {
    const elapsed = tick - op.startTick;
    const isActive = elapsed >= 0 && elapsed < op.duration;

    if (!isActive) continue;

    const asset = assets[op.assetId];
    if (!asset || asset.rugged) continue;

    switch (op.type) {
      case 'pump': {
        // Apply pump boost to price
        const boostFactor = rng.range(1.15, 1.3);
        const currentPrice = assetUpdates[op.assetId]?.price ?? asset.price;
        assetUpdates[op.assetId] = {
          ...assetUpdates[op.assetId],
          price: currentPrice * boostFactor,
        };
        if (elapsed === 0) {
          operationEvents.push({
            tick,
            type: 'info',
            message: `PUMP operation boosted ${asset.symbol} price by ${((boostFactor - 1) * 100).toFixed(1)}%`,
          });
        }
        break;
      }
      case 'wash': {
        // Increase social hype during wash trading
        const hypeBoost = rng.range(0.05, 0.15);
        assetUpdates[op.assetId] = {
          ...assetUpdates[op.assetId],
          socialHype: Math.min(1, (asset.socialHype || 0) + hypeBoost),
        };
        if (elapsed === 0) {
          operationEvents.push({
            tick,
            type: 'info',
            message: `WASH operation creating volume for ${asset.symbol}`,
          });
        }
        break;
      }
      case 'audit': {
        // Audit is instant, applied immediately in OpsPanel
        break;
      }
      case 'bribe': {
        // Bribe is instant, applied immediately in OpsPanel
        break;
      }
    }
  }

  // 3. Process random events
  const eventResult = processTickEvents(tick, assets, player, devMode);

  // Merge event-driven asset updates
  for (const [assetId, updates] of Object.entries(eventResult.assetUpdates)) {
    assetUpdates[assetId] = { ...assetUpdates[assetId], ...updates };
  }

  // 4. Decay audit scores
  for (const asset of Object.values(assets)) {
    if (assetUpdates[asset.id]) {
      const currentScore = asset.auditScore;
      assetUpdates[asset.id].auditScore = decayAuditScore(currentScore, 1);
    }
  }

  // 5. Recalculate player net worth
  let netWorth = player.cashUSD;
  for (const [assetId, units] of Object.entries(player.holdings)) {
    const asset = assets[assetId];
    if (asset && units > 0) {
      const finalPrice = assetUpdates[assetId]?.price ?? asset.price;
      netWorth += units * finalPrice;
    }
  }

  // LP positions
  for (const lp of player.lpPositions) {
    netWorth += lp.usdDeposited; // Simplified: LP value doesn't change (could add IL later)
  }

  const playerUpdates: Partial<PlayerState> = {
    ...eventResult.playerUpdates,
    netWorthUSD: netWorth,
  };

  // 6. Generate random offers (10% chance each tick)
  const newOffers: Offer[] = [];
  if (rng.chance(0.1)) {
    const govOffer = generateGovBumpOffer(tick, player, assets);
    if (govOffer) newOffers.push(govOffer);
  }
  if (rng.chance(0.1)) {
    const whaleOffer = generateWhaleOTCOffer(tick, player, assets);
    if (whaleOffer) newOffers.push(whaleOffer);
  }

  return {
    assetUpdates,
    playerUpdates,
    events: [...operationEvents, ...eventResult.events],
    newOffers: newOffers.length > 0 ? newOffers : undefined,
  };
}
