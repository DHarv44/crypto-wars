/**
 * Chart and historical data types
 */

// Chart resolutions
export type ChartResolution = '1D' | '5D' | '1M' | '1Y' | '5Y';

// OHLC candlestick data
export interface OHLC {
  day: number; // Relative day (-365 = 1 year ago, 0 = today)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Price anchor point (for templates)
export type PriceAnchor = [day: number, price: number];

// Asset profile metadata
export interface AssetProfile {
  volBand: 'low' | 'mid' | 'high'; // Volatility regime
  newsWeight: number; // 0-1, how newsworthy
  influencerWeight: number; // 0-1, how much influencer chatter
  govRisk: number; // 0-1, government/regulatory risk
  memeIndex: number; // 0-1, how meme-ish
  basePattern: 'halving-boom-bust' | 'steady-growth' | 'pump-dump' | 'stable' | 'dead-cat';
}

// Event types
export type EventType = 'news' | 'influencer' | 'whale' | 'regulation' | 'partnership' | 'listing';
export type EventImpact = 'positive' | 'negative' | 'neutral';

// Anchor event (baked into template)
export interface AnchorEvent {
  day: number; // When this event occurred
  type: EventType;
  template: string; // ID of template to use
  impact: number; // -1 to 1, price impact multiplier
}

// Generated event (filled from template)
export interface GeneratedEvent {
  day: number;
  type: EventType;
  headline: string;
  author?: string; // For influencer posts
  impact: EventImpact;
  severity: number; // -1 to 1
  source?: string;
}

// Asset template (static JSON)
export interface AssetTemplate {
  id: string;
  symbol: string;
  name: string;
  profile: AssetProfile;
  anchors: {
    weekly5y: PriceAnchor[]; // ~260 points
    daily1y: PriceAnchor[]; // ~365 points
  };
  anchorEvents: AnchorEvent[];
}

// News template
export interface NewsTemplate {
  id: string;
  headline: string; // With {ASSET}, {AGENCY}, {COMPANY} placeholders
  impact: 'pos' | 'neg' | 'neutral';
  severity: number; // Impact magnitude
  agencies?: string[];
  companies?: string[];
  sources?: string[];
}

// Influencer template
export interface InfluencerTemplate {
  id: string;
  author: string; // With {INFLUENCER} placeholder
  text: string; // With {ASSET}, {TAG} placeholders
  impact: 'pos' | 'neg' | 'neutral';
  severity: number;
  influencers?: string[];
  tags?: string[];
}

// Time series data stored in IndexedDB
export interface TimeSeriesData {
  profileId: string;
  assetId: string;
  resolution: ChartResolution;
  data: OHLC[];
  events: GeneratedEvent[];
  compressed?: boolean;
  timestamp: number; // When generated
}

// Compressed time series (delta encoding)
export interface CompressedTimeSeries {
  profileId: string;
  assetId: string;
  resolution: ChartResolution;
  metadata: {
    count: number;
    startDay: number;
    scale: number; // For quantization
  };
  deltas: {
    days: number[]; // Delta-of-delta
    opens: Int16Array;
    highs: Int16Array;
    lows: Int16Array;
    closes: Int16Array;
    volumes?: Int16Array;
  };
  events: GeneratedEvent[];
  timestamp: number;
}
