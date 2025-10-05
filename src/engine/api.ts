/**
 * Central API for cross-slice communication
 * All actions funnel through here to maintain isolation
 */

import { Asset, PlayerState, Operation } from './types';
import { getRNG } from './rng';
import { applyPump } from './pricing';
import { calculateScrutinyIncrease, calculateExposureIncrease } from './risk';

export interface TradeAction {
  type: 'BUY' | 'SELL';
  assetId: string;
  usd?: number; // For BUY
  units?: number; // For SELL
}

export interface LPAction {
  type: 'PROVIDE_LP' | 'WITHDRAW_LP';
  assetId: string;
  usd?: number; // For PROVIDE
  percent?: number; // For WITHDRAW
}

export interface OpAction {
  type: 'PUMP' | 'WASH' | 'AUDIT' | 'BRIBE';
  assetId?: string;
  budget: number;
  duration?: number;
  recipient?: 'minister' | 'auditor' | 'exchange';
}

export interface InfluencerAction {
  type: 'POST_CONTENT' | 'BUY_FOLLOWERS' | 'START_CAMPAIGN' | 'COLLAB' | 'LAUNCH_TOKEN' | 'RUG_OWN_TOKEN';
  tone?: 'shill' | 'neutral' | 'anti';
  budgetUSD?: number;
  targetAssetId?: string;
  campaignId?: string;
  whaleId?: string;
  tokenParams?: LaunchTokenParams;
  variant?: 'full' | 'partial';
}

export interface LaunchTokenParams {
  symbol: string;
  name: string;
  devReservePct: number;
  initialLiquidityUSD: number;
  auditBudget?: number;
}

/**
 * Execute a trade (BUY or SELL)
 */
export function executeTrade(
  action: TradeAction,
  asset: Asset,
  player: PlayerState
): { assetUpdates: Partial<Asset>; playerUpdates: Partial<PlayerState>; message: string } {
  if (action.type === 'BUY') {
    const usd = action.usd!;
    if (usd > player.cashUSD) {
      throw new Error('Insufficient cash');
    }

    const units = usd / asset.price;
    return {
      assetUpdates: {},
      playerUpdates: {
        cashUSD: player.cashUSD - usd,
        holdings: {
          ...player.holdings,
          [asset.id]: (player.holdings[asset.id] || 0) + units,
        },
      },
      message: `Bought ${units.toFixed(4)} ${asset.symbol} for $${usd.toFixed(2)}`,
    };
  } else {
    // SELL
    const units = action.units!;
    const currentUnits = player.holdings[asset.id] || 0;
    if (units > currentUnits) {
      throw new Error('Insufficient units');
    }

    const usd = units * asset.price;
    return {
      assetUpdates: {},
      playerUpdates: {
        cashUSD: player.cashUSD + usd,
        holdings: {
          ...player.holdings,
          [asset.id]: currentUnits - units,
        },
      },
      message: `Sold ${units.toFixed(4)} ${asset.symbol} for $${usd.toFixed(2)}`,
    };
  }
}

/**
 * Execute LP action (PROVIDE or WITHDRAW)
 */
export function executeLP(
  action: LPAction,
  asset: Asset,
  player: PlayerState
): { playerUpdates: Partial<PlayerState>; message: string } {
  if (action.type === 'PROVIDE_LP') {
    const usd = action.usd!;
    if (usd > player.cashUSD) {
      throw new Error('Insufficient cash');
    }

    const units = usd / asset.price;
    const newLP = {
      assetId: asset.id,
      usdDeposited: usd,
      unitsDeposited: units,
      depositedAtTick: 0, // Will be set by slice
    };

    return {
      playerUpdates: {
        cashUSD: player.cashUSD - usd,
        lpPositions: [...player.lpPositions, newLP],
      },
      message: `Provided $${usd.toFixed(2)} liquidity to ${asset.symbol}`,
    };
  } else {
    // WITHDRAW_LP
    const percent = action.percent!;
    const position = player.lpPositions.find((lp) => lp.assetId === asset.id);
    if (!position) {
      throw new Error('No LP position found');
    }

    const withdrawUSD = position.usdDeposited * (percent / 100);
    const remaining = player.lpPositions.map((lp) =>
      lp.assetId === asset.id
        ? { ...lp, usdDeposited: lp.usdDeposited * (1 - percent / 100) }
        : lp
    );

    return {
      playerUpdates: {
        cashUSD: player.cashUSD + withdrawUSD,
        lpPositions: remaining.filter((lp) => lp.usdDeposited > 0.01),
      },
      message: `Withdrew ${percent}% LP from ${asset.symbol} (+$${withdrawUSD.toFixed(2)})`,
    };
  }
}

/**
 * Execute operation (PUMP, WASH, AUDIT, BRIBE)
 */
export function executeOp(
  action: OpAction,
  tick: number,
  asset: Asset | undefined,
  player: PlayerState
): {
  operation: Operation;
  assetUpdates?: Partial<Asset>;
  playerUpdates: Partial<PlayerState>;
  message: string;
} {
  if (action.budget > player.cashUSD) {
    throw new Error('Insufficient cash');
  }

  const rng = getRNG();

  if (action.type === 'PUMP') {
    const newPrice = applyPump(asset!, action.budget);
    const exposure = calculateExposureIncrease('pump', action.budget);
    const scrutiny = calculateScrutinyIncrease('pump', action.budget);

    return {
      operation: {
        id: `op_${Date.now()}`,
        type: 'pump',
        assetId: asset!.id,
        cost: action.budget,
        startTick: tick,
        duration: 1,
      },
      assetUpdates: { price: newPrice },
      playerUpdates: {
        cashUSD: player.cashUSD - action.budget,
        exposure: player.exposure + exposure,
        scrutiny: player.scrutiny + scrutiny,
      },
      message: `Pumped ${asset!.symbol} (+${((newPrice / asset!.price - 1) * 100).toFixed(1)}%)`,
    };
  } else if (action.type === 'WASH') {
    const exposure = calculateExposureIncrease('wash', action.budget);
    const scrutiny = calculateScrutinyIncrease('wash', action.budget);

    return {
      operation: {
        id: `op_${Date.now()}`,
        type: 'wash',
        assetId: asset!.id,
        cost: action.budget,
        startTick: tick,
        duration: action.duration || 3,
      },
      playerUpdates: {
        cashUSD: player.cashUSD - action.budget,
        exposure: player.exposure + exposure,
        scrutiny: player.scrutiny + scrutiny,
      },
      message: `Started wash trading ${asset!.symbol} for ${action.duration} ticks`,
    };
  } else if (action.type === 'AUDIT') {
    const scoreIncrease = rng.range(0.15, 0.35);

    return {
      operation: {
        id: `op_${Date.now()}`,
        type: 'audit',
        assetId: asset!.id,
        cost: action.budget,
        startTick: tick,
        duration: 1,
      },
      assetUpdates: {
        auditScore: Math.min(1, asset!.auditScore + scoreIncrease),
      },
      playerUpdates: {
        cashUSD: player.cashUSD - action.budget,
      },
      message: `Audited ${asset!.symbol} (+${(scoreIncrease * 100).toFixed(0)}% audit score)`,
    };
  } else {
    // BRIBE
    const scrutinyDecrease = rng.range(10, 25);

    return {
      operation: {
        id: `op_${Date.now()}`,
        type: 'bribe',
        assetId: asset?.id || '',
        cost: action.budget,
        startTick: tick,
        duration: 1,
      },
      playerUpdates: {
        cashUSD: player.cashUSD - action.budget,
        scrutiny: Math.max(0, player.scrutiny - scrutinyDecrease),
      },
      message: `Bribed ${action.recipient} (-${scrutinyDecrease} scrutiny)`,
    };
  }
}

/**
 * Execute influencer action
 */
export function executeInfluencerAction(
  action: InfluencerAction,
  _tick: number,
  player: PlayerState,
  influencer: { followers: number; engagement: number; authenticity: number }
): { playerUpdates: Partial<PlayerState>; influencerUpdates: Record<string, unknown>; message: string; newAsset?: Asset } {
  const rng = getRNG();

  if (action.type === 'POST_CONTENT') {
    const followerDelta = rng.int(10, 500) * (action.budgetUSD! / 100);
    const engagementDelta = rng.range(-0.02, 0.05);

    return {
      playerUpdates: {
        cashUSD: player.cashUSD - (action.budgetUSD || 0),
      },
      influencerUpdates: {
        followers: influencer.followers + followerDelta,
        engagement: Math.max(0, Math.min(1, influencer.engagement + engagementDelta)),
      },
      message: `Posted ${action.tone} content (+${followerDelta} followers)`,
    };
  } else if (action.type === 'BUY_FOLLOWERS') {
    const followersPurchased = action.budgetUSD! * 10;
    const authenticityLoss = rng.range(0.05, 0.15);

    return {
      playerUpdates: {
        cashUSD: player.cashUSD - action.budgetUSD!,
      },
      influencerUpdates: {
        followers: influencer.followers + followersPurchased,
        authenticity: Math.max(0, influencer.authenticity - authenticityLoss),
      },
      message: `Bought ${followersPurchased.toFixed(0)} followers (-${(authenticityLoss * 100).toFixed(0)}% authenticity)`,
    };
  } else if (action.type === 'LAUNCH_TOKEN') {
    const params = action.tokenParams!;
    const newAsset: Asset = {
      id: `player_${params.symbol.toLowerCase()}`,
      symbol: params.symbol,
      name: params.name,
      basePrice: 1.0,
      price: 1.0,
      liquidityUSD: params.initialLiquidityUSD,
      devTokensPct: params.devReservePct,
      auditScore: params.auditBudget ? rng.range(0.3, 0.6) : 0,
      socialHype: influencer.followers / 100000,
      baseVolatility: 0.15,
      govFavorScore: 0,
      flagged: false,
      rugged: false,
      isPlayerToken: true,
      priceHistory: [],
    };

    const totalCost = params.initialLiquidityUSD + (params.auditBudget || 0);

    return {
      playerUpdates: {
        cashUSD: player.cashUSD - totalCost,
      },
      influencerUpdates: {},
      message: `Launched ${params.symbol} token!`,
      newAsset,
    };
  } else if (action.type === 'RUG_OWN_TOKEN') {
    const payout = rng.range(50000, 500000);
    const scrutinyIncrease = rng.range(40, 80);
    const repLoss = rng.range(50, 100);

    return {
      playerUpdates: {
        cashUSD: player.cashUSD + payout,
        scrutiny: player.scrutiny + scrutinyIncrease,
        reputation: player.reputation - repLoss,
        blacklisted: true,
      },
      influencerUpdates: {},
      message: `Rugged own token for $${payout.toFixed(0)} (BLACKLISTED!)`,
    };
  }

  return {
    playerUpdates: {},
    influencerUpdates: {},
    message: 'Action not implemented',
  };
}
