/**
 * Backfill engine - Generate historical price data from templates
 * Uses deterministic seed-based generation for reproducibility
 */

import type { AssetTemplate, OHLC, GeneratedEvent, NewsTemplate, InfluencerTemplate } from './types';
import { initRNG } from '../engine/rng';
import { storeTimeSeries } from './db';

// Import templates
import btcTemplate from './assets/BTC.json';
import ethTemplate from './assets/ETH.json';
import dogeTemplate from './assets/DOGE.json';
import newsTemplates from './templates/news.json';
import influencerTemplates from './templates/influencers.json';

const ASSET_TEMPLATES: AssetTemplate[] = [
  btcTemplate as AssetTemplate,
  ethTemplate as AssetTemplate,
  dogeTemplate as AssetTemplate,
];

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
 * Returns: { news events for ticker, price history per asset }
 */
export async function backfillProfile(profileId: string, seed: number): Promise<{
  newsEvents: GeneratedEvent[];
  priceHistory: Record<string, OHLC[]>;
}> {
  console.log(`[Backfill] Starting for profile ${profileId} with seed ${seed}`);

  const allNewsEvents: GeneratedEvent[] = [];
  const priceHistory: Record<string, OHLC[]> = {};

  for (const template of ASSET_TEMPLATES) {
    console.log(`[Backfill] Processing ${template.symbol}...`);

    // Generate events first (used by 1Y data)
    const events = generateEvents(template, -365, 0, seed);
    console.log(`[Backfill] Generated ${events.length} events for ${template.symbol}`);

    // Generate additional news specifically for the last 5 days (2-3 articles per asset)
    const recentNewsCount = Math.floor(initRNG(seed + template.symbol.charCodeAt(0)).range(2, 4));
    const recentRng = initRNG(seed + template.symbol.charCodeAt(0) + 999);

    for (let i = 0; i < recentNewsCount; i++) {
      const day = Math.floor(recentRng.range(-5, 1)); // Days -5 to 0
      const newsTemplate = newsTemplates[Math.floor(recentRng.range(0, newsTemplates.length))];
      const event = fillNewsTemplate(template, newsTemplate as NewsTemplate, recentRng);

      if (event) {
        events.push({ ...event, day });
        allNewsEvents.push({
          ...event,
          day,
          assetId: template.id,
          assetSymbol: template.symbol
        });
      }
    }

    console.log(`[Backfill] Generated ${recentNewsCount} recent news articles for ${template.symbol}`);

    // Generate 1Y daily data (this becomes the historical priceHistory)
    const daily1y = generate1YData(template, seed, events);

    // Store as PriceCandle format (convert OHLC to PriceCandle with tick)
    priceHistory[template.id] = daily1y.map((ohlc, index) => ({
      tick: index,
      day: ohlc.day,
      open: ohlc.open,
      high: ohlc.high,
      low: ohlc.low,
      close: ohlc.close,
    }));

    console.log(`[Backfill] Completed ${template.symbol} - ${priceHistory[template.id].length} candles`);
  }

  console.log(`[Backfill] Profile ${profileId} complete! Generated ${allNewsEvents.length} news articles for ticker`);
  return { newsEvents: allNewsEvents, priceHistory };
}

/**
 * Get available assets
 */
export function getAvailableAssets(): AssetTemplate[] {
  return ASSET_TEMPLATES;
}
