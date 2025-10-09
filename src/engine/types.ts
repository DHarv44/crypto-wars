// Core simulation types

export type EngineStatus = 'idle' | 'running' | 'paused';
export type TickSpeed = 1 | 2 | 4;

export type AssetTier = 'bluechip' | 'midcap' | 'shitcoin';

export type MarketVibe =
  | 'moonshot'    // 1-3 random coins selected for major pumps (10%)
  | 'bloodbath'   // Market-wide crash, everything bleeds (8%)
  | 'rugseason'   // High rug probability (3%)
  | 'whalewar'    // Volatile swings, competing whales (3%)
  | 'normie'      // Normal boring day (61%)
  | 'memefrenzy'; // Social hype drives everything (15%)

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
  volume: number; // Daily trading volume (0-1 scale)
  tier: AssetTier; // Asset tier for rug pull protection
  rugWarned?: boolean; // Has received warning news before rug
  rugStartTick?: number; // When rug pull began (for gradual mechanics)
  momentum?: number; // -1 to 1 (bearish to bullish)
  narrative?: 'moon' | 'stable' | 'rug' | null; // Current narrative arc
  // Price history for charts (pre-aggregated by resolution)
  priceHistory?: PriceHistoryByResolution;
}

export interface PriceCandle {
  tick: number;
  day: number; // Which day this candle belongs to
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PriceHistoryByResolution {
  today: PriceCandle[];      // Intra-day trades (variable length, live tick data)
  yesterday: PriceCandle[];  // Previous day's aggregated candles (6 candles for context)
  d5: PriceCandle[];         // Last 5 days (6 candles per day = 30 total)
  m1: PriceCandle[];         // 30 candles (1 per day × 30 days)
  y1: PriceCandle[];         // 365 candles (1 per day × 365 days)
  y5: PriceCandle[];         // ~260 candles (1 per week × 52 weeks × 5 years)
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

export interface LimitOrder {
  id: string;
  assetId: string;
  assetSymbol: string;
  type: 'buy' | 'sell';
  triggerPrice: number;
  amount: number; // USD for buy, units for sell
  createdDay: number;
  expiresDay?: number; // Optional expiration
  status: 'pending' | 'executed' | 'cancelled' | 'expired';
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
  predictedVibe?: MarketVibe; // For prediction news - which vibe is being predicted
  debunkedDay?: number; // When fake news was revealed
  impactRealized: boolean; // Did it actually move the price?
}
