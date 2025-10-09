import { Asset, GameEvent, PlayerState } from './types';
import { getRNG } from './rng';
import {
  calculateRugProbability,
  calculateExitScamProbability,
  calculateOracleHackProbability,
  calculateWhaleBuybackProbability,
  calculateFreezeProbability,
} from './risk';
import { applyRugInitial, applyWhaleBuyback, applyOracleHack } from './pricing';
import { canAssetRug, canAssetExitScam } from './tiers';

let eventIdCounter = 0;

function generateEventId(): string {
  return `evt_${Date.now()}_${eventIdCounter++}`;
}

export interface EventResult {
  events: GameEvent[];
  assetUpdates: Partial<Record<string, Partial<Asset>>>;
  playerUpdates: Partial<PlayerState>;
}

/**
 * Process all random events for a single tick
 */
export function processTickEvents(
  tick: number,
  assets: Record<string, Asset>,
  player: PlayerState,
  devMode: boolean
): EventResult {
  const rng = getRNG();
  const events: GameEvent[] = [];
  const assetUpdates: Partial<Record<string, Partial<Asset>>> = {};
  const playerUpdates: Partial<PlayerState> = {};

  const eventMultiplier = devMode ? 5 : 1; // Boost event rates in dev mode

  // 1. Rug pulls (only if warned AND tier allows it)
  for (const asset of Object.values(assets)) {
    if (asset.rugged || asset.flagged || !canAssetRug(asset)) continue;

    // Require warning before rug (news/alert must have happened)
    if (!asset.rugWarned) continue;

    const rugProb = calculateRugProbability(asset) * eventMultiplier;
    if (rng.chance(rugProb)) {
      const result = applyRugInitial(asset);
      assetUpdates[asset.id] = {
        price: result.price,
        liquidityUSD: result.liquidity,
        rugged: true,
        rugStartTick: tick, // Mark when rug started
        flagged: true,
      };

      events.push({
        id: generateEventId(),
        tick,
        type: 'rug',
        assetId: asset.id,
        message: `🚨 RUG PULL INITIATED: ${asset.symbol} crashed ${((1 - result.price / asset.price) * 100).toFixed(1)}%! Price bleeding...`,
        severity: 'danger',
        metadata: { oldPrice: asset.price, newPrice: result.price },
      });
    }
  }

  // 2. Exit scams (extremely rare, shitcoins only, instant drop to near zero)
  for (const asset of Object.values(assets)) {
    if (asset.rugged || !canAssetExitScam(asset)) continue;

    // Extremely rare: 0.001% base chance (0.00001)
    const exitScamProb = 0.00001 * eventMultiplier;
    if (rng.chance(exitScamProb)) {
      assetUpdates[asset.id] = {
        price: asset.price * 0.001, // Drop to 0.1% of value
        liquidityUSD: 0,
        rugged: true,
        flagged: true,
      };

      events.push({
        id: generateEventId(),
        tick,
        type: 'exit_scam',
        assetId: asset.id,
        message: `💀 EXIT SCAM: ${asset.symbol} devs vanished with all funds!`,
        severity: 'danger',
      });

      playerUpdates.scrutiny = (player.scrutiny || 0) + rng.range(5, 15);
    }
  }

  // 3. Oracle hacks (global)
  const oracleHackProb = calculateOracleHackProbability() * eventMultiplier;
  if (rng.chance(oracleHackProb)) {
    const victims = Object.values(assets).filter((a) => !a.rugged);
    if (victims.length > 0) {
      const victim = rng.pick(victims);
      const newPrice = applyOracleHack(victim);
      const change = ((newPrice - victim.price) / victim.price) * 100;

      assetUpdates[victim.id] = { price: newPrice };

      events.push({
        id: generateEventId(),
        tick,
        type: 'oracle_hack',
        assetId: victim.id,
        message: `⚡ ORACLE HACK: ${victim.symbol} ${change > 0 ? 'spiked' : 'crashed'} ${Math.abs(change).toFixed(0)}%!`,
        severity: 'warning',
        metadata: { duration: rng.int(1, 3) },
      });
    }
  }

  // 4. Whale buybacks
  for (const asset of Object.values(assets)) {
    if (asset.rugged) continue;

    const whaleProb = calculateWhaleBuybackProbability(asset) * eventMultiplier;
    if (rng.chance(whaleProb)) {
      const newPrice = applyWhaleBuyback(asset);
      const change = ((newPrice - asset.price) / asset.price) * 100;

      assetUpdates[asset.id] = { price: newPrice };

      events.push({
        id: generateEventId(),
        tick,
        type: 'whale_buyback',
        assetId: asset.id,
        message: `🐋 WHALE ALERT: ${asset.symbol} pumped ${change.toFixed(0)}% from buyback!`,
        severity: 'success',
      });
    }
  }

  // 5. Freeze events
  const freezeProb = calculateFreezeProbability(player) * eventMultiplier;
  if (rng.chance(freezeProb)) {
    const freezePct = rng.range(0.1, 0.4);
    const duration = rng.int(3, 10);

    events.push({
      id: generateEventId(),
      tick,
      type: 'freeze',
      message: `🧊 ACCOUNT FREEZE: ${(freezePct * 100).toFixed(0)}% of centralized holdings locked for ${duration} ticks!`,
      severity: 'danger',
      metadata: { freezePct, duration },
    });

    playerUpdates.scrutiny = Math.max(0, (player.scrutiny || 0) - 10);
  }

  return { events, assetUpdates, playerUpdates };
}

/**
 * Check for gov bump offer eligibility (handled in offers slice)
 */
export function canTriggerGovBump(player: PlayerState, concentrationFactor: number): boolean {
  const rng = getRNG();
  const prob = 0.002 * (1 + player.influence * 0.25) * concentrationFactor;
  return rng.chance(prob);
}
