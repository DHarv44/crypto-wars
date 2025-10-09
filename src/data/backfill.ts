/**
 * Backfill engine - Generate historical price data from templates
 * Uses deterministic seed-based generation for reproducibility
 */

import type { AssetTemplate, OHLC, GeneratedEvent, NewsTemplate, InfluencerTemplate } from './types';
import { initRNG } from '../engine/rng';
import { PriceHistoryByResolution, PriceCandle } from '../engine/types';
import { MIN_PRICE } from '../utils/format';

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

  // Start at day 0 (today) with current basePrice
  // Work backward to generate history
  let currentPrice = basePrice; // Start at current price (day 0)

  // Calculate launch price (30-70% of current for normal coins, 70-95% for ultra-low)
  const priceRangeMin = basePrice < 0.0001 ? 0.7 : 0.3;
  const priceRangeMax = basePrice < 0.0001 ? 0.95 : 0.7;
  const launchPrice = basePrice * rng.range(priceRangeMin, priceRangeMax);

  // Calculate drift (working backward from basePrice to launchPrice)
  const totalDays = endDay - startDay;
  const priceRatio = launchPrice / currentPrice;
  const dailyDrift = (Math.log(priceRatio) / totalDays) * 0.8; // 80% of needed drift (backward)

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

  // Generate prices working backward from day 0 to startDay
  for (let day = endDay; day >= startDay; day--) {
    // Generate OHLC for this day
    const intradayVol = adjustedVolatility * 0.5;
    const high = Math.max(MIN_PRICE, currentPrice * (1 + Math.abs(rng.range(0, intradayVol))));
    const low = Math.max(MIN_PRICE, currentPrice * (1 - Math.abs(rng.range(0, intradayVol))));
    const open = Math.max(MIN_PRICE, currentPrice * (1 + rng.range(-intradayVol * 0.5, intradayVol * 0.5)));
    const close = Math.max(MIN_PRICE, currentPrice);

    ohlc.unshift({
      day,
      open,
      high: Math.max(open, close, high),
      low: Math.max(MIN_PRICE, Math.min(open, close, low)),
      close,
    });

    // Move backward to previous day
    if (day > startDay) {
      // Check for pump/dump event (working backward)
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

      // Random walk backward with drift toward launch price
      const dailyChange = rng.range(-adjustedVolatility, adjustedVolatility) + dailyDrift;
      currentPrice = currentPrice * (1 + dailyChange) / pumpMultiplier;

      // Enforce price floor
      currentPrice = Math.max(MIN_PRICE, currentPrice);
      // Keep price reasonable relative to basePrice
      currentPrice = Math.max(currentPrice, basePrice * 0.01);
      currentPrice = Math.min(currentPrice, basePrice * 50); // Cap at 50x current
    }
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
 * Generate 6 aggregated candles from a daily OHLC (5-minute periods for 30-minute day)
 * Proper OHLCV aggregation like Google Finance 5D charts
 */
function generateIntradayCandles(dailyCandle: PriceCandle, seed: number): PriceCandle[] {
  const rng = initRNG(seed + dailyCandle.day);
  const candles: PriceCandle[] = [];

  const priceRange = dailyCandle.high - dailyCandle.low;
  const ticksPerDay = 1800;
  const candlesPerDay = 6; // 6 candles = 6 × 5 minutes = 30 minutes
  const ticksPerCandle = ticksPerDay / candlesPerDay; // 300 ticks per candle

  // Generate 1800 intraday ticks
  const allTicks: number[] = [];
  let currentPrice = dailyCandle.open;

  for (let tick = 0; tick < ticksPerDay; tick++) {
    const t = tick / ticksPerDay;

    // Interpolate toward close price with noise
    const targetPrice = dailyCandle.open + (dailyCandle.close - dailyCandle.open) * t;
    const noise = rng.range(-priceRange * 0.05, priceRange * 0.05);
    const newPrice = Math.max(dailyCandle.low, Math.min(dailyCandle.high, targetPrice + noise));

    allTicks.push(newPrice);
    currentPrice = newPrice;
  }

  // Aggregate into 6 candles (proper OHLCV)
  for (let i = 0; i < candlesPerDay; i++) {
    const startIdx = i * ticksPerCandle;
    const endIdx = startIdx + ticksPerCandle;
    const periodTicks = allTicks.slice(startIdx, endIdx);

    if (periodTicks.length > 0) {
      candles.push({
        tick: startIdx,
        day: dailyCandle.day,
        open: periodTicks[0],
        high: Math.max(...periodTicks),
        low: Math.min(...periodTicks),
        close: periodTicks[periodTicks.length - 1],
      });
    }
  }

  return candles;
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

  // Generate news for TODAY (day 1) + last 4 days
  console.log('[Backfill] Generating news for today (day 1) + last 4 days...');
  const newsRng = initRNG(seed + 5000);
  for (let day = 1; day >= -3; day--) {
    const articlesThisDay = Math.floor(newsRng.range(8, 13)); // 8-12 articles per day
    const dayLabel = day === 1 ? 'TODAY (day 1)' : `day ${day}`;
    console.log(`[Backfill] ${dayLabel}: generating ${articlesThisDay} articles`);

    for (let i = 0; i < articlesThisDay; i++) {
      const randomAsset = assetsSeed[Math.floor(newsRng.range(0, assetsSeed.length))];
      const isPositive = newsRng.range(0, 1) < 0.5;
      const templates = isPositive ? newsTemplates.filter((t: any) => t.impact === 'pos') : newsTemplates.filter((t: any) => t.impact === 'neg');

      if (templates.length === 0) {
        console.error('[Backfill] No templates found for impact:', isPositive ? 'pos' : 'neg');
        continue;
      }

      const template = templates[Math.floor(newsRng.range(0, templates.length))] as any;
      let headline = template.headline.replace('{ASSET}', randomAsset.symbol);

      // Replace {COMPANY} placeholder if exists
      if (template.companies && headline.includes('{COMPANY}')) {
        const company = template.companies[Math.floor(newsRng.range(0, template.companies.length))];
        headline = headline.replace('{COMPANY}', company);
      }

      // Replace {AGENCY} placeholder if exists
      if (template.agencies && headline.includes('{AGENCY}')) {
        const agency = template.agencies[Math.floor(newsRng.range(0, template.agencies.length))];
        headline = headline.replace('{AGENCY}', agency);
      }

      const impact = isPositive ? 'positive' : 'negative';
      const severity = Math.abs(template.severity || 0.05);

      allNewsEvents.push({
        day: day,
        assetId: randomAsset.id,
        assetSymbol: randomAsset.symbol,
        headline,
        impact,
        severity,
      });
    }
  }

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
    // d5: Last 5 days, 20 trades per day = 100 trades max
    // m1: Last 30 days, 1 candle per day = 30 candles
    // y1: All available days (up to 365)
    // y5: Weekly candles for 5 years (only if launched 5+ years ago)

    const y1 = daily1yCandles; // All available days
    const m1 = daily1yCandles.slice(-Math.min(30, maxHistoryDays)); // Last 30 days or less

    // Generate 6 candles per day for d5 (last 5 days = 30 candles total)
    const d5Days = Math.min(5, maxHistoryDays);
    const d5Candles: PriceCandle[] = [];
    const last5DaysData = daily1yCandles.slice(-d5Days);

    // Fix day-to-day continuity: ensure each day's open = previous day's close
    for (let i = 0; i < last5DaysData.length; i++) {
      const dayCandle = { ...last5DaysData[i] };

      // If not the first day, adjust open to match previous close
      if (i > 0 && d5Candles.length > 0) {
        const prevDayLastCandle = d5Candles[d5Candles.length - 1];
        dayCandle.open = prevDayLastCandle.close;
      }

      // Generate 6 intraday candles from this day's OHLC (5-minute periods)
      const candles = generateIntradayCandles(dayCandle, seed + asset.symbol.charCodeAt(0));
      d5Candles.push(...candles);
    }

    const d5 = d5Candles;

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

    // Generate yesterday data with realistic trade volume matching live trading density
    const lastDayCandle = daily1yCandles[daily1yCandles.length - 1]; // Day -1 OHLC
    const yesterday: PriceCandle[] = [];

    if (lastDayCandle) {
      // Use same trade probability formula as live trading (line 147 in rootStore.ts)
      // tradeChance = 0.1 + (dynamicVolume * 0.8) = 10% to 90% per tick

      // Calculate average volume for the asset (simplified, no vibe/momentum for historical)
      const baseVolume = 0.3 + ((asset.volume || 0.5) * 0.4); // 0.3-0.7 range
      const hypeMultiplier = 0.5 + ((asset.socialHype || 0.5) * 1.0); // 0.5-1.5x
      const avgDynamicVolume = Math.min(1.0, baseVolume * hypeMultiplier); // Cap at 1.0

      // Calculate expected trades based on probability
      const ticksPerDay = 1800;
      const avgTradeChance = 0.1 + (avgDynamicVolume * 0.8); // 10% to 90%
      const expectedTrades = Math.floor(ticksPerDay * avgTradeChance); // 180-1620 trades

      // Add some randomness ±20%
      const numTrades = Math.floor(expectedTrades * (0.8 + Math.random() * 0.4));

      // Create unique seed using full symbol hash
      let symbolHash = 0;
      for (let i = 0; i < asset.symbol.length; i++) {
        symbolHash = ((symbolHash << 5) - symbolHash) + asset.symbol.charCodeAt(i);
        symbolHash = symbolHash & symbolHash; // Convert to 32bit integer
      }
      const rng = initRNG(seed + symbolHash + lastDayCandle.day * 1000);

      let currentPrice = lastDayCandle.open;
      const priceRange = lastDayCandle.high - lastDayCandle.low;

      // Randomize wave characteristics per asset
      const waveFrequency = rng.range(1.5, 3.5); // Different cycle counts per asset
      const waveAmplitude = rng.range(0.01, 0.03); // 1-3% wave influence (reduced from 10%)

      for (let i = 0; i < numTrades; i++) {
        const t = i / numTrades;

        // Add realistic intraday volatility using multiple techniques:

        // 1. Brownian motion with drift toward close (INCREASED randomness)
        const drift = (lastDayCandle.close - lastDayCandle.open) / numTrades;
        const volatility = priceRange * 0.08; // Increased from 0.05
        const brownian = rng.range(-volatility, volatility);

        // 2. Sine wave for intraday cycles (REDUCED influence, randomized per asset)
        const sineWave = Math.sin(t * Math.PI * waveFrequency) * priceRange * waveAmplitude;

        // 3. Occasional mini pumps/dumps (increased chance)
        let spike = 0;
        if (rng.chance(0.08)) { // Increased from 0.05
          spike = rng.range(-priceRange * 0.2, priceRange * 0.2);
        }

        // Combine all movements (Brownian motion should dominate)
        const targetPrice = currentPrice + drift + brownian + sineWave + spike;
        const newPrice = Math.max(lastDayCandle.low, Math.min(lastDayCandle.high, targetPrice));

        yesterday.push({
          tick: i,
          day: -1,
          open: currentPrice,
          high: Math.max(currentPrice, newPrice),
          low: Math.min(currentPrice, newPrice),
          close: newPrice,
        });

        currentPrice = newPrice;
      }
    }

    priceHistory[asset.id] = {
      today: [], // Empty at game start
      yesterday, // Previous day's 6 candles for 1D context
      d5,
      m1,
      y1,
      y5,
    };

    console.log(`[Backfill] Completed ${asset.symbol} - yesterday:${yesterday.length}, d5:${d5.length}, m1:${m1.length}, y1:${y1.length}, y5:${y5.length}`);
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
