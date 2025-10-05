import { Asset, PlayerState } from './types';
import { clamp } from './pricing';

/**
 * Rug probability (per tick)
 * rugProb = clamp(
 *   0.015
 *   + (devTokensPct/100)*0.012
 *   - auditScore*0.010
 *   + (0.30 - liquidityFactor)*0.04
 *   + socialHype*0.01,
 *   0.002, 0.45
 * )
 */
export function calculateRugProbability(asset: Asset): number {
  const liquidityFactor = clamp(asset.liquidityUSD / 1_000_000, 0, 1);
  const prob =
    0.015 +
    (asset.devTokensPct / 100) * 0.012 -
    asset.auditScore * 0.01 +
    (0.3 - liquidityFactor) * 0.04 +
    asset.socialHype * 0.01;

  return clamp(prob, 0.002, 0.45);
}

/**
 * Exit scam probability (per tick)
 * Higher if devTokensPct > 35
 */
export function calculateExitScamProbability(asset: Asset): number {
  if (asset.devTokensPct <= 35) return 0;
  return 0.000055;
}

/**
 * Oracle hack probability (global, per tick)
 */
export function calculateOracleHackProbability(): number {
  return 0.00003;
}

/**
 * Whale buyback probability (per tick, per asset)
 */
export function calculateWhaleBuybackProbability(asset: Asset): number {
  if (asset.liquidityUSD < 200_000) return 0;
  return 0.00005;
}

/**
 * Gov bump probability (per tick)
 * Depends on player influence and concentration
 */
export function calculateGovBumpProbability(
  player: PlayerState,
  concentrationFactor: number
): number {
  return 0.002 * (1 + player.influence * 0.25) * concentrationFactor;
}

/**
 * Freeze probability (per tick)
 * chance = clamp(base + exposure*0.005 + scrutiny*0.01 − security*0.02, 0, 0.9)
 */
export function calculateFreezeProbability(player: PlayerState): number {
  const base = 0.001;
  const prob = base + player.exposure * 0.005 + player.scrutiny * 0.01 - player.security * 0.02;
  return clamp(prob, 0, 0.9);
}

/**
 * Audit decay: auditScore naturally decays over time
 */
export function decayAuditScore(currentScore: number, ticksPassed: number): number {
  const decayRate = 0.02; // per tick
  return Math.max(0, currentScore - decayRate * ticksPassed);
}

/**
 * Scrutiny increase from operations
 */
export function calculateScrutinyIncrease(
  operationType: 'pump' | 'wash' | 'bribe',
  budget: number
): number {
  const base = {
    pump: 0.05,
    wash: 0.1,
    bribe: 0.15,
  };
  return base[operationType] * (budget / 1000);
}

/**
 * Exposure increase from operations
 */
export function calculateExposureIncrease(operationType: 'pump' | 'wash', budget: number): number {
  const base = {
    pump: 0.08,
    wash: 0.12,
  };
  return base[operationType] * (budget / 1000);
}
