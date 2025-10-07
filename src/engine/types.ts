// Core simulation types

export type EngineStatus = 'idle' | 'running' | 'paused';
export type TickSpeed = 1 | 2 | 4;

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  basePrice: number;
  price: number;
  liquidityUSD: number;
  devTokensPct: number;
  auditScore: number;
  socialHype: number;
  baseVolatility: number;
  govFavorScore: number;
  flagged: boolean;
  rugged: boolean;
  isPlayerToken?: boolean;
  // Price history for charts (OHLC)
  priceHistory?: PriceCandle[];
}

export interface PriceCandle {
  tick: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LPPosition {
  assetId: string;
  usdDeposited: number;
  unitsDeposited: number;
  depositedAtTick: number;
}

export interface Trade {
  id: string;
  tick: number;
  timestamp: number;
  type: 'buy' | 'sell';
  assetId: string;
  assetSymbol: string;
  units: number;
  pricePerUnit: number;
  totalUSD: number;
  fees?: number;
  realizedPnL?: number; // For sells
}

export interface PositionCostBasis {
  assetId: string;
  totalUnits: number;
  totalCostUSD: number;
  avgPrice: number;
  trades: string[]; // Trade IDs
}

export interface PlayerState {
  cashUSD: number;
  netWorthUSD: number;
  reputation: number;
  influence: number;
  security: number;
  scrutiny: number;
  exposure: number;
  holdings: Record<string, number>; // assetId -> units
  lpPositions: LPPosition[];
  blacklisted: boolean;

  // P&L tracking
  trades: Trade[];
  costBasis: Record<string, PositionCostBasis>; // assetId -> cost basis
  realizedPnL: number; // Lifetime realized profit/loss
  initialNetWorth: number; // Starting net worth for ROI calc
  netWorthHistory: Array<{ tick: number; value: number }>; // For charts
}

export type OperationType = 'pump' | 'wash' | 'audit' | 'bribe';

export interface Operation {
  id: string;
  type: OperationType;
  assetId: string;
  cost: number;
  startTick: number;
  duration: number;
}

export interface Offer {
  id: string;
  type: 'gov_bump' | 'whale_otc';
  assetId?: string;
  description: string;
  action: string;
  cost: number;
  benefit: number;
  consequence?: string;
  expiresAtTick: number;
  accepted?: boolean;
}

export interface GameEvent {
  id?: string;
  tick: number;
  type:
    | 'rug'
    | 'exit_scam'
    | 'oracle_hack'
    | 'whale_buyback'
    | 'gov_bump'
    | 'freeze'
    | 'viral_post'
    | 'trade'
    | 'op_complete'
    | 'offer'
    | 'info'
    | 'warning'
    | 'success'
    | 'danger';
  assetId?: string;
  message: string;
  severity?: 'info' | 'warning' | 'danger' | 'success';
  metadata?: Record<string, unknown>;
}

export interface InfluencerState {
  followers: number;
  engagement: number;
  authenticity: number;
  cloutTier: number;
  pendingCampaigns: Campaign[];
  sponsoredIncomeUSD: number;
  lastViralTick?: number;
}

export interface Campaign {
  id: string;
  name: string;
  budgetUSD: number;
  startedTick: number;
  duration: number;
  expectedFollowers: number;
}

export interface Replay {
  id: string;
  tick: number;
  events: GameEvent[];
  causeChain: string[];
}

export interface NewsArticle {
  id: string;
  day: number;
  assetId: string;
  assetSymbol: string;
  headline: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  weight: number; // 0-100
  category: string;
  isFake: boolean;
  debunkedDay?: number; // When fake news was revealed
  impactRealized: boolean; // Did it actually move the price?
}
