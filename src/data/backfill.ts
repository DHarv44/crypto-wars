/**
 * Backfill engine - Generate historical price data from templates
 * Uses deterministic seed-based generation for reproducibility
 */

import type { AssetTemplate, OHLC, GeneratedEvent, NewsTemplate, InfluencerTemplate } from './types';
import { initRNG } from '../engine/rng';
import { PriceHistoryByResolution, PriceCandle } from '../engine/types';

// Import templates
import btcTemplate from './assets/BTC.json';
import ethTemplate from './assets/ETH.json';
import dogeTemplate from './assets/DOGE.json';
import assetsSeed from '../engine/assets.seed.json';
import newsTemplates from './templates/news.json';
import influencerTemplates from './templates/influencers.json';

// Map of assets with detailed anchor templates
const ANCHOR_TEMPLATES: Record<string, AssetTemplate> = {
  'BTC': btcTemplate as AssetTemplate,
  'ETH': ethTemplate as AssetTemplate,
  'DOGE': dogeTemplate as AssetTemplate,
};

/**
 * Linear interpolation between two anchor points
 */
function interpolate(day: number, anchors: [number, number][]): number {
  // Find surrounding anchor points
  let before = anchors[0];
  let after = anchors[anchors.length - 1];

  for (let i = 0; i < anchors.length - 1; i++) {
    if (day >= anchors[i][0] && day <= anchors[i + 1][0]) {
      before = anchors[i];
      after = anchors[i + 1];
      break;
    }
  }

  // Linear interpolation
  const [day1, price1] = before;
  const [day2, price2] = after;

  if (day1 === day2) return price1;

  const t = (day - day1) / (day2 - day1);
  return price1 + (price2 - price1) * t;
}

/**
 * Generate OHLC from base price with volatility
 */
function generateOHLC(day: number, basePrice: number, volatility: number, rng: any): OHLC {
  // Apply daily volatility
  const dailyChange = rng.range(-volatility, volatility);
  const close = basePrice * (1 + dailyChange);

  // Generate intraday range
  const range = Math.abs(rng.range(0, volatility * 0.5));
  const high = close * (1 + range);
  const low = close * (1 - range);

  // Open is somewhere in the range
  const openBias = rng.range(-0.3, 0.3);
  const open = close * (1 + openBias * range);

  return {
    day,
    open,
    high: Math.max(open, close, high),
    low: Math.min(open, close, low),
    close,
  };
}

/**
 * Apply event impact to price over multiple days (exponential decay)
 */
function applyEventImpact(
  basePrice: number,
  impact: number,
  daysSinceEvent: number,
  halfLife: number = 5
): number {
  if (daysSinceEvent < 0) return basePrice;

  // Exponential decay: impact * exp(-ln(2) * days / halfLife)
  const decay = Math.exp((-Math.LN2 * daysSinceEvent) / halfLife);
  const priceImpact = impact * decay;

  return basePrice * (1 + priceImpact);
}

/**
 * Generate events from templates using deterministic seeding
 */
function generateEvents(
  template: AssetTemplate,
  startDay: number,
  endDay: number,
  seed: number
): GeneratedEvent[] {
  const rng = initRNG(seed);
  const events: GeneratedEvent[] = [];

  // Add anchor events (guaranteed, from template)
  for (const anchor of template.anchorEvents) {
    if (anchor.day >= startDay && anchor.day <= endDay) {
      const event = fillEventTemplate(template, anchor.template, anchor.type, anchor.impact, rng);
      if (event) {
        events.push({
          ...event,
          day: anchor.day,
        });
      }
    }
  }

  // Calculate event density based on profile
  const { newsWeight, influencerWeight } = template.profile;
  const totalDays = endDay - startDay;
  const newsCount = Math.floor(totalDays * newsWeight * 0.02); // ~2% of days have news
  const influencerCount = Math.floor(totalDays * influencerWeight * 0.03); // ~3% have posts

  // Generate random news events
  for (let i = 0; i < newsCount; i++) {
    const day = Math.floor(rng.range(startDay, endDay));

    // Skip if day already has an anchor event
    if (template.anchorEvents.some((a) => a.day === day)) continue;

    const newsTemplate = newsTemplates[Math.floor(rng.range(0, newsTemplates.length))];
    const event = fillNewsTemplate(template, newsTemplate as NewsTemplate, rng);

    if (event) {
      events.push({ ...event, day });
    }
  }

  // Generate random influencer posts
  for (let i = 0; i < influencerCount; i++) {
    const day = Math.floor(rng.range(startDay, endDay));

    const infTemplate = influencerTemplates[Math.floor(rng.range(0, influencerTemplates.length))];
    const event = fillInfluencerTemplate(template, infTemplate as InfluencerTemplate, rng);

    if (event) {
      events.push({ ...event, day });
    }
  }

  // Sort by day
  events.sort((a, b) => a.day - b.day);

  return events;
}

/**
 * Fill placeholders in event template
 */
function fillEventTemplate(
  asset: AssetTemplate,
  templateId: string,
  type: string,
  impact: number,
  rng: any
): GeneratedEvent | null {
  // Find template by ID
  const newsTemplate = newsTemplates.find((t: any) => t.id === templateId);
  if (newsTemplate) {
    return fillNewsTemplate(asset, newsTemplate as NewsTemplate, rng, impact);
  }

  const infTemplate = influencerTemplates.find((t: any) => t.id === templateId);
  if (infTemplate) {
    return fillInfluencerTemplate(asset, infTemplate as InfluencerTemplate, rng, impact);
  }

  return null;
}

/**
 * Fill news template with asset-specific data
 */
function fillNewsTemplate(
  asset: AssetTemplate,
  template: NewsTemplate,
  rng: any,
  overrideImpact?: number
): GeneratedEvent {
  let headline = template.headline.replace('{ASSET}', asset.symbol);

  // Replace agency placeholder
  if (template.agencies && headline.includes('{AGENCY}')) {
    const agency = template.agencies[Math.floor(rng.range(0, template.agencies.length))];
    headline = headline.replace('{AGENCY}', agency);
  }

  // Replace company placeholder
  if (template.companies && headline.includes('{COMPANY}')) {
    const company = template.companies[Math.floor(rng.range(0, template.companies.length))];
    headline = headline.replace('{COMPANY}', company);
  }

  // Pick source
  const source = template.sources
    ? template.sources[Math.floor(rng.range(0, template.sources.length))]
    : 'CryptoNews';

  return {
    day: 0, // Will be set by caller
    type: 'news',
    headline,
    impact: template.impact === 'pos' ? 'positive' : template.impact === 'neg' ? 'negative' : 'neutral',
    severity: overrideImpact ?? template.severity,
    source,
  };
}

/**
 * Fill influencer template with asset-specific data
 */
function fillInfluencerTemplate(
  asset: AssetTemplate,
  template: InfluencerTemplate,
  rng: any,
  overrideImpact?: number
): GeneratedEvent {
  let text = template.text.replace('{ASSET}', asset.symbol);

  // Replace influencer placeholder
  let author = template.author;
  if (template.influencers && author.includes('{INFLUENCER}')) {
    const influencer = template.influencers[Math.floor(rng.range(0, template.influencers.length))];
    author = author.replace('{INFLUENCER}', influencer);
  }

  // Replace tag placeholder
  if (template.tags && text.includes('{TAG}')) {
    const tag = template.tags[Math.floor(rng.range(0, template.tags.length))];
    text = text.replace('{TAG}', tag);
  }

  return {
    day: 0, // Will be set by caller
    type: 'influencer',
    headline: text,
    author,
    impact: template.impact === 'pos' ? 'positive' : template.impact === 'neg' ? 'negative' : 'neutral',
    severity: overrideImpact ?? template.severity,
  };
}

/**
 * Generate historical data using random walk (for assets without anchor templates)
 * Uses asset characteristics to create realistic price history
 */
function generateRandomWalkData(
  asset: any,
  startDay: number,
  endDay: number,
  seed: number
): OHLC[] {
  const rng = initRNG(seed);
  const ohlc: OHLC[] = [];

  // Asset characteristics
  const basePrice = asset.basePrice;
  const baseVolatility = asset.baseVolatility;
  const socialHype = asset.socialHype;
  const devTokensPct = asset.devTokensPct;
  const auditScore = asset.auditScore;
  const liquidityUSD = asset.liquidityUSD;

  // Calculate adjusted volatility based on liquidity
  // Lower liquidity = more volatile
  const liquidityFactor = Math.max(0.5, Math.min(2, 1000000 / liquidityUSD));
  const adjustedVolatility = baseVolatility * liquidityFactor;

  // Start price (launched at 30-70% of current basePrice)
  let currentPrice = basePrice * rng.range(0.3, 0.7);
  const targetPrice = basePrice; // Should end near current price

  // Calculate drift to reach target price by day 0
  const totalDays = endDay - startDay;
  const priceRatio = targetPrice / currentPrice;
  const dailyDrift = (Math.log(priceRatio) / totalDays) * 0.8; // 80% of needed drift

  // Detect if this is a meme coin (high hype, high dev tokens, low audit)
  const isMeme = socialHype > 0.7 && devTokensPct > 40 && auditScore < 0.3;

  // Add pump/dump events for meme coins
  const pumpDumpEvents: Array<{ day: number; magnitude: number }> = [];
  if (isMeme) {
    // 2-4 pump/dump cycles during history
    const numEvents = Math.floor(rng.range(2, 5));
    for (let i = 0; i < numEvents; i++) {
      const eventDay = Math.floor(rng.range(startDay + 10, endDay - 10));
      const magnitude = rng.range(1.5, 4); // 150% to 400% pump
      pumpDumpEvents.push({ day: eventDay, magnitude });
    }
  }

  for (let day = startDay; day <= endDay; day++) {
    // Check for pump/dump event
    let pumpMultiplier = 1;
    for (const event of pumpDumpEvents) {
      const daysSinceEvent = day - event.day;
      if (daysSinceEvent >= 0 && daysSinceEvent < 20) {
        // Pump over 5 days, dump over 15 days
        if (daysSinceEvent < 5) {
          // Pump phase
          pumpMultiplier *= 1 + (event.magnitude - 1) * (daysSinceEvent / 5);
        } else {
          // Dump phase (exponential decay)
          const dumpProgress = (daysSinceEvent - 5) / 15;
          pumpMultiplier *= event.magnitude * Math.exp(-3 * dumpProgress);
        }
      }
    }

    // Random walk with drift toward target
    const dailyChange = rng.range(-adjustedVolatility, adjustedVolatility) + dailyDrift;
    currentPrice = currentPrice * (1 + dailyChange) * pumpMultiplier;

    // Keep price reasonable
    currentPrice = Math.max(currentPrice, basePrice * 0.01);
    currentPrice = Math.min(currentPrice, basePrice * 50); // Cap at 50x current

    // Generate OHLC with intraday volatility
    const intradayVol = adjustedVolatility * 0.5;
    const high = currentPrice * (1 + Math.abs(rng.range(0, intradayVol)));
    const low = currentPrice * (1 - Math.abs(rng.range(0, intradayVol)));
    const open = currentPrice * (1 + rng.range(-intradayVol * 0.5, intradayVol * 0.5));
    const close = currentPrice;

    ohlc.push({
      day,
      open,
      high: Math.max(open, close, high),
      low: Math.min(open, close, low),
      close,
    });
  }

  return ohlc;
}

/**
 * Generate 5Y weekly data
 */
function generate5YData(template: AssetTemplate, seed: number): OHLC[] {
  const rng = initRNG(seed + template.symbol.charCodeAt(0));
  const ohlc: OHLC[] = [];

  // Use weekly anchors directly
  for (let i = 0; i < template.anchors.weekly5y.length; i++) {
    const [day, basePrice] = template.anchors.weekly5y[i];

    const volatility = template.profile.volBand === 'high' ? 0.15 : template.profile.volBand === 'mid' ? 0.08 : 0.04;

    ohlc.push(generateOHLC(day * 7, basePrice, volatility, rng)); // Weekly = 7 days
  }

  return ohlc;
}

/**
 * Generate 1Y daily data
 */
function generate1YData(template: AssetTemplate, seed: number, events: GeneratedEvent[]): OHLC[] {
  const rng = initRNG(seed + template.symbol.charCodeAt(0) + 1);
  const ohlc: OHLC[] = [];

  const startDay = -365;
  const endDay = 0;

  for (let day = startDay; day <= endDay; day++) {
    // Get base price from anchors
    let basePrice = interpolate(day, template.anchors.daily1y);

    // Apply event impacts
    for (const event of events) {
      if (event.day <= day) {
        const daysSince = day - event.day;
        basePrice = applyEventImpact(basePrice, event.severity, daysSince);
      }
    }

    const volatility = template.profile.volBand === 'high' ? 0.08 : template.profile.volBand === 'mid' ? 0.04 : 0.02;

    ohlc.push(generateOHLC(day, basePrice, volatility, rng));
  }

  return ohlc;
}

/**
 * Generate 1M hourly data (synthesized from daily)
 */
function generate1MData(template: AssetTemplate, seed: number, dailyData: OHLC[]): OHLC[] {
  const rng = initRNG(seed + template.symbol.charCodeAt(0) + 2);
  const ohlc: OHLC[] = [];

  // Get last 30 days
  const last30Days = dailyData.slice(-30);

  for (const daily of last30Days) {
    // Generate 24 hourly bars that fit within daily OHLC
    const hourlyBars = 24;
    const priceRange = daily.high - daily.low;

    for (let hour = 0; hour < hourlyBars; hour++) {
      const t = hour / hourlyBars;

      // Interpolate from open to close
      const basePrice = daily.open + (daily.close - daily.open) * t;

      // Add micro volatility (constrained to daily range)
      const microVol = priceRange * 0.1;
      const noise = rng.range(-microVol, microVol);

      const close = Math.max(daily.low, Math.min(daily.high, basePrice + noise));
      const open = Math.max(daily.low, Math.min(daily.high, basePrice + rng.range(-microVol, microVol)));

      const high = Math.max(open, close) * (1 + rng.range(0, 0.005));
      const low = Math.min(open, close) * (1 - rng.range(0, 0.005));

      ohlc.push({
        day: daily.day + hour / 24,
        open,
        high,
        low,
        close,
      });
    }
  }

  return ohlc;
}

/**
 * Backfill all historical data for a profile
 * Returns: { news events for ticker, price history per asset (pre-aggregated) }
 */
export async function backfillProfile(profileId: string, seed: number): Promise<{
  newsEvents: GeneratedEvent[];
  priceHistory: Record<string, PriceHistoryByResolution>;
}> {
  console.log(`[Backfill] Starting for profile ${profileId} with seed ${seed}`);

  const allNewsEvents: GeneratedEvent[] = [];
  const priceHistory: Record<string, PriceHistoryByResolution> = {};

  for (const asset of assetsSeed) {
    console.log(`[Backfill] Processing ${asset.symbol}...`);

    const launchedDaysAgo = (asset as any).launchedDaysAgo || 365;
    const maxHistoryDays = Math.min(launchedDaysAgo, 365); // Cap at 1 year for now
    const startDay = -maxHistoryDays;
    const endDay = 0;

    // Check if we have an anchor template for this asset
    const anchorTemplate = ANCHOR_TEMPLATES[asset.symbol];
    let daily1y: OHLC[];

    if (anchorTemplate) {
      // Use anchor-based generation for BTC/ETH/DOGE
      const events = generateEvents(anchorTemplate, startDay, endDay, seed);
      console.log(`[Backfill] Generated ${events.length} events for ${asset.symbol}`);
      daily1y = generate1YData(anchorTemplate, seed, events);
    } else {
      // Use random walk for all other assets
      daily1y = generateRandomWalkData(asset, startDay, endDay, seed + asset.symbol.charCodeAt(0));
    }

    // Convert to PriceCandle format
    const daily1yCandles: PriceCandle[] = daily1y.map((ohlc, index) => ({
      tick: index,
      day: ohlc.day,
      open: ohlc.open,
      high: ohlc.high,
      low: ohlc.low,
      close: ohlc.close,
    }));

    // Build pre-aggregated resolution arrays
    // today: Empty (current day has no history yet)
    // d5: Last 5 days, 3 candles per day = 15 candles
    // m1: Last 30 days, 1 candle per day = 30 candles
    // y1: All available days (up to 365)
    // y5: Weekly candles for 5 years (only if launched 5+ years ago)

    const y1 = daily1yCandles; // All available days
    const m1 = daily1yCandles.slice(-Math.min(30, maxHistoryDays)); // Last 30 days or less
    const d5 = daily1yCandles.slice(-Math.min(5, maxHistoryDays)); // Last 5 days or less

    // y5: Only generate if asset has 5 year history
    let y5: PriceCandle[] = [];
    if (launchedDaysAgo >= 1825 && anchorTemplate) {
      // Only BTC/ETH/DOGE with anchor templates get 5Y data
      const y5Data = generate5YData(anchorTemplate, seed);
      y5 = y5Data.map((ohlc, index) => ({
        tick: index,
        day: ohlc.day,
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
      }));
    }

    priceHistory[asset.id] = {
      today: [], // Empty at game start
      d5,
      m1,
      y1,
      y5,
    };

    console.log(`[Backfill] Completed ${asset.symbol} - d5:${d5.length}, m1:${m1.length}, y1:${y1.length}, y5:${y5.length}`);
  }

  console.log(`[Backfill] Profile ${profileId} complete! Generated ${allNewsEvents.length} news articles for ticker`);
  return { newsEvents: allNewsEvents, priceHistory };
}

/**
 * Get available assets
 */
export function getAvailableAssets(): any[] {
  return assetsSeed;
}
