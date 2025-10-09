import { create } from 'zustand';
import { createEngineSlice, EngineSlice } from './engineSlice';
import { createMarketSlice, MarketSlice } from './marketSlice';
import { createPlayerSlice, PlayerSlice } from './playerSlice';
import { createEventsSlice, EventsSlice } from '../features/events/eventsSlice';
import { createTradingSlice, TradingSlice } from '../features/trading/tradingSlice';
import { createOpsSlice, OpsSlice } from '../features/ops/opsSlice';
import { createOffersSlice, OffersSlice } from '../features/offers/offersSlice';
import { createInfluencerSlice, InfluencerSlice } from '../features/influencer/influencerSlice';
import { createOnboardingSlice, OnboardingSlice } from '../features/onboarding/onboardingSlice';
import { createSocialSlice, SocialSlice } from './socialSlice';
import { createUnlocksSlice, UnlocksSlice } from './unlocksSlice';
import { createNewsSlice, NewsSlice } from '../features/news/newsSlice';
import { executeTick } from '../engine/tick';
import { executeTrade } from '../engine/api';
import { saveGame, loadGame } from '../utils/persistence';
import { setActiveProfileId } from '../utils/storage';
import { rollDailyNews, applyNewsImpact, checkFakeNewsDebunks, reverseFakeNewsImpact, generateRugWarnings, generateVibeHints } from '../engine/news';
import { MIN_PRICE, TRADING_FEE } from '../utils/format';
import { applyRugBleed } from '../engine/pricing';
import { calculateDynamicVolume } from '../engine/volume';
import { shouldLaunchCoin, generateNewCoin, getDaysSinceLastLaunch, generateLaunchHypeNews } from '../engine/coinLaunch';

export type RootStore = EngineSlice & MarketSlice & PlayerSlice & EventsSlice & TradingSlice & OpsSlice & OffersSlice & InfluencerSlice & OnboardingSlice & SocialSlice & UnlocksSlice & NewsSlice & {
  // Dirty flag for auto-save optimization
  isDirty: boolean;
  markDirty: () => void;

  // Day processing state
  isProcessingDay: boolean;
  isSimulating: boolean;  // Flag to suppress UI updates during backfill simulation

  // Orchestration actions
  initGame: () => Promise<void>;
  processTick: () => void;  // NEW: Runs every game second (intra-day price updates)
  processDay: () => Promise<void>;  // Runs when day advances (daily events, news, etc)
  simulateBackfill: (days: number) => Promise<void>;  // Run simulation for N days to generate real data
  loadGame: () => Promise<void>;
  saveGame: () => Promise<void>;
};

export const useStore = create<RootStore>((set, get, store) => ({
  // Combine all slices
  ...createEngineSlice(set as any, get as any, store as any),
  ...createMarketSlice(set as any, get as any, store as any),
  ...createPlayerSlice(set as any, get as any, store as any),
  ...createEventsSlice(set as any, get as any, store as any),
  ...createTradingSlice(set as any, get as any, store as any),
  ...createOpsSlice(set as any, get as any, store as any),
  ...createOffersSlice(set as any, get as any, store as any),
  ...createInfluencerSlice(set as any, get as any, store as any),
  ...createOnboardingSlice(set as any, get as any, store as any),
  ...createSocialSlice(set as any, get as any, store as any),
  ...createUnlocksSlice(set as any, get as any, store as any),
  ...createNewsSlice(set as any, get as any, store as any),

  // Dirty flag for auto-save
  isDirty: false,
  markDirty: () => set({ isDirty: true }),

  // Day processing state
  isProcessingDay: false,
  isSimulating: false,

  // Orchestration
  initGame: async () => {
    console.log('[rootStore] initGame START');
    const state = get();

    // Initialize new game
    state.init();
    state.loadSeed();
    state.init(); // Re-init player
    state.initInfluencer();
    state.initSocial();
    state.initUnlocks();

    // Set active profile ID in cache if profile exists
    if (state.profile?.id) {
      setActiveProfileId(state.profile.id);
      console.log('[rootStore] Set active profile ID after initGame:', state.profile.id);
    }

    // Save initial state and WAIT for it to complete
    // Note: Historical data (news, price charts) is backfilled separately in Screen3Vibe.tsx
    await state.saveGame();
    console.log('[rootStore] initGame COMPLETE - game saved');
  },

  // NEW: Process a single game tick (1 second of game time)
  // Handles intra-day price updates based on volume
  processTick: () => {
    const state = get();
    const tick = state.tick || 0;
    const day = state.day || 1;
    const assets = state.assets;

    // Only process ticks when status is 'trading'
    if (state.simulationStatus !== 'trading') {
      return;
    }

    // Check if timer expired
    const elapsed = Date.now() - state.dayStartTimestamp;
    if (elapsed >= state.realTimeDayDuration) {
      set({ simulationStatus: 'end-of-day' });
      return;
    }

    // Increment tick counter
    set({ tick: tick + 1 });

    // For each asset, probabilistically determine if a trade occurs
    const assetUpdates: Record<string, Partial<any>> = {};

    for (const asset of Object.values(assets)) {
      // Handle gradual rug pull bleed
      if (asset.rugged && asset.rugStartTick !== undefined) {
        // Apply bleed every ~30 ticks (every 30 seconds during 30min day)
        const ticksSinceRug = tick + 1 - asset.rugStartTick;
        if (ticksSinceRug % 30 === 0) {
          const newPrice = applyRugBleed(asset, tick + 1);
          assetUpdates[asset.id] = {
            ...assetUpdates[asset.id],
            price: newPrice,
          };
        }
        continue; // Skip normal trading for rugged assets
      }

      if (asset.rugged) continue;

      // Calculate dynamic volume based on multiple factors
      const dynamicVolume = calculateDynamicVolume(
        asset,
        state.marketVibe,
        tick + 1,
        1800, // ticks per day
        state.vibeTargetAssets
      );

      // Calculate trade probability based on dynamic volume (0-1 scale)
      // Higher volume = more frequent trades
      // Base chance: 10% at volume=0, up to 90% at volume=1
      const tradeChance = 0.1 + (dynamicVolume * 0.8);
      const rng = Math.random();

      if (rng < tradeChance) {
        // Trade occurs - update price
        const oldPrice = asset.price;
        const noise = (Math.random() - 0.5) * 2 * 0.1; // -0.1 to 0.1

        // Scale volatility for intra-day tick movements (random walk scaling)
        const ticksPerDay = 1800;
        const scaledVolatility = asset.baseVolatility / Math.sqrt(ticksPerDay);

        const sigma = scaledVolatility * (0.8 + asset.socialHype * 0.6) * (1 + noise);
        const delta = (Math.random() - 0.5) * 2 * sigma; // Approximate normal distribution
        const newPrice = Math.max(MIN_PRICE, oldPrice * (1 + delta));

        // Get or create current day's candle in today array
        const priceHistory = asset.priceHistory || {
          today: [],
          yesterday: [],
          d5: [],
          m1: [],
          y1: [],
          y5: [],
        };

        const today = priceHistory.today || [];

        // Add new trade candle to today
        const tradeCandle = {
          tick: tick + 1,
          day,
          open: oldPrice,
          high: Math.max(oldPrice, newPrice),
          low: Math.min(oldPrice, newPrice),
          close: newPrice,
        };
        today.push(tradeCandle);

        assetUpdates[asset.id] = {
          price: newPrice,
          priceHistory: {
            ...priceHistory,
            today,
          },
        };
      }
    }

    // Apply updates if any trades occurred
    if (Object.keys(assetUpdates).length > 0) {
      state.applyTickUpdates(assetUpdates);

      // Recalculate net worth and update history
      const prices = Object.fromEntries(
        Object.values(assets).map(asset => [asset.id, assetUpdates[asset.id]?.price ?? asset.price])
      );
      state.recalcNetWorth(prices, tick + 1);

      state.markDirty(); // Mark for auto-save
    }

    // Check pending limit orders (use updated assets from state after price changes)
    const pendingOrders = state.getPendingOrders();
    for (const order of pendingOrders) {
      const currentAsset = state.assets[order.assetId];
      if (!currentAsset) continue;

      // Check if price condition met
      const shouldExecute =
        (order.type === 'buy' && currentAsset.price <= order.triggerPrice) ||
        (order.type === 'sell' && currentAsset.price >= order.triggerPrice);

      if (shouldExecute) {
        // Execute trade automatically via executeTrade API
        try {
          const playerState: any = {
            cashUSD: state.cashUSD,
            holdings: state.holdings,
            netWorthUSD: state.netWorthUSD,
            reputation: state.reputation,
            influence: state.influence,
            security: state.security,
            scrutiny: state.scrutiny,
            exposure: state.exposure,
            lpPositions: state.lpPositions,
            blacklisted: state.blacklisted,
          };

          const tradeResult = executeTrade(
            {
              type: order.type === 'buy' ? 'BUY' : 'SELL',
              assetId: order.assetId,
              usd: order.type === 'buy' ? order.amount : undefined,
              units: order.type === 'sell' ? order.amount : undefined,
            },
            currentAsset,
            playerState
          );

          // Apply trade results
          if (tradeResult.assetUpdates && Object.keys(tradeResult.assetUpdates).length > 0) {
            state.applyTickUpdates({ [currentAsset.id]: tradeResult.assetUpdates });
          }
          if (tradeResult.playerUpdates) {
            state.applyUpdates(tradeResult.playerUpdates);
          }

          // Record trade
          const units = order.type === 'buy' ? (order.amount / currentAsset.price) : order.amount;
          state.recordTrade({
            tick: state.tick,
            type: order.type,
            assetId: order.assetId,
            assetSymbol: order.assetSymbol,
            units: units,
            pricePerUnit: currentAsset.price,
            totalUSD: order.type === 'buy' ? order.amount : (order.amount * currentAsset.price),
            fees: order.type === 'sell' ? TRADING_FEE : undefined,
          });

          // Mark order as executed
          state.executeLimitOrder(order.id);

          // Push event to feed
          state.pushEvent({
            tick: state.tick,
            type: 'trade',
            message: `⚡ LIMIT ORDER EXECUTED: ${order.type.toUpperCase()} ${order.assetSymbol} at ${currentAsset.price.toFixed(8)}`,
            severity: 'success',
          });

          state.markDirty(); // Mark for auto-save
        } catch (error) {
          console.error('[RootStore] Failed to execute limit order:', error);
        }
      }
    }
  },

  // Process day advancement (called when day changes)
  // Handles daily events, news, offers, etc
  processDay: async () => {
    const state = get();

    // Skip UI updates during simulation
    if (!state.isSimulating) {
      set({ isProcessingDay: true });

      // Wait for fade animation (0.5s as defined in CSS)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Ensure loading screen shows for at least 3 seconds total (only during normal gameplay)
    const startTime = Date.now();
    const minLoadingTime = state.isSimulating ? 0 : 3000;
    const day = state.day;
    const assets = state.assets;

    // Select vibe target assets for the new day's market vibe
    const vibeTargets = state.selectVibeTargets(state.marketVibe, assets);
    set({ vibeTargetAssets: vibeTargets });

    // Calculate remaining ticks in the day and simulate them
    const ticksPerDay = 1800;
    const remaining = state.getTimeUntilNextDay();
    const elapsed = state.realTimeDayDuration - remaining;
    const currentTickInDay = Math.floor((elapsed / state.realTimeDayDuration) * ticksPerDay);
    const remainingTicks = ticksPerDay - currentTickInDay;

    console.log(`[processDay] Simulating ${remainingTicks} remaining ticks for day ${day}`);

    // Simulate remaining ticks to complete the day's price action
    for (let i = 0; i < remainingTicks; i++) {
      state.processTick();
    }

    const player: any = {
      cashUSD: state.cashUSD,
      netWorthUSD: state.netWorthUSD,
      reputation: state.reputation,
      influence: state.influence,
      security: state.security,
      scrutiny: state.scrutiny,
      exposure: state.exposure,
      holdings: state.holdings,
      lpPositions: state.lpPositions,
      blacklisted: state.blacklisted,
    };

    // Execute daily tick (news, events, offers)
    const result = executeTick(day, assets, player, state.devMode, state.activeOps);

    // Apply updates
    state.applyTickUpdates(result.assetUpdates);
    state.applyUpdates(result.playerUpdates);

    // Push events to feed
    for (const event of result.events) {
      state.pushEvent(event);
    }

    // Add new offers
    if (result.newOffers) {
      for (const offer of result.newOffers) {
        state.addOffer(offer);
        state.pushEvent({
          tick: day,
          type: 'info',
          message: `New ${offer.type === 'gov_bump' ? 'government' : 'whale'} offer available`,
        });
      }
    }

    // Remove expired offers
    const expiredOffers = state.activeOffers.filter((o) => o.expiresAtTick <= day);
    for (const offer of expiredOffers) {
      state.removeOffer(offer.id);
    }

    // Update social stats (reset daily counter)
    state.updateDailySocial();

    // Check post triggers (price moves, viral, horizon)
    state.checkPostTriggers();

    // Check for unlocks
    state.checkUnlocks();

    // Generate rug pull warnings (20% chance, 1-2 warnings)
    const { articles: warningArticles, warnedAssets } = generateRugWarnings(day, assets);

    // Mark warned assets
    const warningUpdates: Record<string, Partial<any>> = {};
    for (const assetId of warnedAssets) {
      warningUpdates[assetId] = { rugWarned: true };
    }
    if (Object.keys(warningUpdates).length > 0) {
      state.applyTickUpdates(warningUpdates);
    }

    // Roll daily news (2-5 articles)
    const dailyNews = rollDailyNews(day, assets);

    // Generate predictive hints about tomorrow's vibe (30% chance)
    const nextDayVibe = state.rollMarketVibe(); // Peek at tomorrow's vibe
    const vibeHintArticles = generateVibeHints(day, nextDayVibe, assets);

    // Check if we should launch a new coin today
    const daysSinceLastLaunch = getDaysSinceLastLaunch(assets, day);
    const shouldLaunch = shouldLaunchCoin(day, state.marketVibe, daysSinceLastLaunch);

    let launchArticles: any[] = [];
    if (shouldLaunch) {
      // Generate new coin
      const newCoin = generateNewCoin(day);

      // Add to market
      state.addAsset(newCoin);

      // Generate launch announcement news
      launchArticles.push({
        id: `launch_${day}_${newCoin.symbol}`,
        day,
        assetId: newCoin.id,
        assetSymbol: newCoin.symbol,
        headline: `🎉 NEW LAUNCH: ${newCoin.symbol} debuts on exchange!`,
        sentiment: 'bullish',
        weight: 80,
        category: 'launch',
        isFake: false,
        impactRealized: false,
      });

      // Push event to feed
      state.pushEvent({
        tick: day,
        type: 'info',
        message: `🚀 NEW COIN: ${newCoin.symbol} (${newCoin.name}) just launched!`,
        severity: 'success',
      });
    }

    // Check if we should generate hype for a coin launching in 2-3 days
    const willLaunchSoon = shouldLaunchCoin(day + 2, nextDayVibe, daysSinceLastLaunch + 2);
    let hypeArticles: any[] = [];
    if (willLaunchSoon && daysSinceLastLaunch > 1) {
      // Pre-generate the coin symbol that will launch in 2 days
      const upcomingCoin = generateNewCoin(day + 2);
      hypeArticles = generateLaunchHypeNews(day, upcomingCoin.symbol, 2);
    }

    // Combine all articles
    const allDailyArticles = [
      ...warningArticles,
      ...dailyNews,
      ...vibeHintArticles,
      ...launchArticles,
      ...hypeArticles,
    ];
    state.addArticles(allDailyArticles);

    // Apply news impact to affected assets
    const newsUpdates: Record<string, Partial<any>> = {};
    for (const article of allDailyArticles) {
      const asset = assets[article.assetId];
      if (asset) {
        const impact = applyNewsImpact(asset, [article]);
        newsUpdates[article.assetId] = {
          ...(newsUpdates[article.assetId] || {}),
          ...impact,
        };

        // Mark impact as realized if price changed significantly
        if (impact.price && Math.abs(impact.price - asset.price) / asset.price > 0.01) {
          state.markImpactRealized(article.id);
        }
      }
    }

    // Apply news-driven price changes
    if (Object.keys(newsUpdates).length > 0) {
      state.applyTickUpdates(newsUpdates);
    }

    // Check for fake news debunks
    const toDebunk = checkFakeNewsDebunks(day, state.articles);
    const debunkUpdates: Record<string, Partial<any>> = {};

    for (const articleId of toDebunk) {
      const article = state.articles.find((a) => a.id === articleId);
      if (article) {
        state.debunkArticle(articleId, day);

        // Reverse the fake hype impact
        const asset = assets[article.assetId];
        if (asset) {
          const reverseImpact = reverseFakeNewsImpact(asset, article);
          debunkUpdates[article.assetId] = {
            ...(debunkUpdates[article.assetId] || {}),
            ...reverseImpact,
          };
        }

        // Add debunk event to feed
        state.pushEvent({
          tick: day,
          type: 'info',
          message: `📰 DEBUNKED: ${article.headline.substring(0, 60)}... was fake news!`,
          severity: 'warning',
        });
      }
    }

    // Apply debunk impacts
    if (Object.keys(debunkUpdates).length > 0) {
      state.applyTickUpdates(debunkUpdates);
    }

    // Clean old news (keep last 200 days)
    state.clearOldNews(day - 200);

    // Apply pre-market price adjustment (overnight gap up/down based on vibe)
    const preMarketUpdates: Record<string, Partial<any>> = {};
    for (const asset of Object.values(state.assets)) {
      if (asset.rugged) continue; // Skip rugged assets

      const yesterday = asset.priceHistory?.yesterday;
      if (!yesterday || yesterday.length === 0) continue;

      const yesterdayClose = yesterday[yesterday.length - 1].close;

      // Calculate overnight gap based on market vibe
      let gapPercent = 0;
      switch (state.marketVibe) {
        case 'moonshot':
          gapPercent = Math.random() * 0.05 + 0.02; // +2% to +7% gap up
          break;
        case 'bloodbath':
          gapPercent = -(Math.random() * 0.05 + 0.02); // -2% to -7% gap down
          break;
        case 'memefrenzy':
          gapPercent = (Math.random() - 0.5) * 0.04; // -2% to +2% random
          break;
        case 'rugseason':
          gapPercent = -(Math.random() * 0.03); // 0% to -3% gap down
          break;
        case 'whalewar':
          gapPercent = (Math.random() - 0.5) * 0.06; // -3% to +3% volatile
          break;
        default: // normie
          gapPercent = (Math.random() - 0.5) * 0.015; // -0.75% to +0.75% small gap
      }

      const newPrice = yesterdayClose * (1 + gapPercent);
      preMarketUpdates[asset.id] = { price: newPrice };
    }

    // Apply pre-market gaps
    if (Object.keys(preMarketUpdates).length > 0) {
      state.applyTickUpdates(preMarketUpdates);
    }

    // Aggregate today's trades into resolution arrays (pop/push pattern)
    const priceHistoryUpdates: Record<string, Partial<any>> = {};
    for (const asset of Object.values(state.assets)) {
      const priceHistory = asset.priceHistory;
      if (!priceHistory || !priceHistory.today || priceHistory.today.length === 0) continue;

      const today = priceHistory.today;

      const aggregateCandles = (candles: any[]) => {
        if (candles.length === 0) return null;
        return {
          tick: candles[0].tick,
          day: candles[0].day,
          open: candles[0].open,
          high: Math.max(...candles.map(c => c.high)),
          low: Math.min(...candles.map(c => c.low)),
          close: candles[candles.length - 1].close,
        };
      };

      // Aggregate today into 6 candles (5-minute periods, like Google Finance 5D)
      const candlesPerDay = 6;
      const ticksPerCandle = 300; // 1800 ticks / 6 candles
      const aggregatedCandles: any[] = [];

      if (today.length > 0) {
        // Group today's trades by 5-minute periods and aggregate into OHLCV
        for (let i = 0; i < candlesPerDay; i++) {
          const startTick = i * ticksPerCandle;
          const endTick = startTick + ticksPerCandle;

          // Find all trades in this period
          const periodTrades = today.filter((t: any) => t.tick >= startTick && t.tick < endTick);

          if (periodTrades.length > 0) {
            aggregatedCandles.push({
              tick: startTick,
              day,
              open: periodTrades[0].open,
              high: Math.max(...periodTrades.map((t: any) => t.high)),
              low: Math.min(...periodTrades.map((t: any) => t.low)),
              close: periodTrades[periodTrades.length - 1].close,
            });
          }
        }
      }

      // Calculate 1 daily candle from all trades (for m1, y1, y5)
      const dailyCandle = aggregateCandles(today);

      // Save today's aggregated candles to yesterday (for 1D context)
      const newYesterday = aggregatedCandles.map(c => ({ ...c, day: day - 1 })); // Mark as yesterday

      // Pop oldest day from d5 (remove 6 candles from day 6) and push today's 6 candles
      const candlesPerDayD5 = 6;
      const oldestDayStart = priceHistory.d5.findIndex((c: any) => c.day === day - 5);
      const oldestDayEnd = priceHistory.d5.findIndex((c: any) => c.day === day - 4);
      const candlesToRemove = oldestDayEnd >= 0 ? oldestDayEnd : (oldestDayStart >= 0 ? candlesPerDayD5 : 0);
      const newD5 = [...priceHistory.d5.slice(candlesToRemove), ...aggregatedCandles];

      // Pop oldest from m1 (remove day 31) and push today's 1
      const newM1 = dailyCandle ? [...priceHistory.m1.slice(1), dailyCandle] : priceHistory.m1;

      // Pop oldest from y1 (remove day 366) and push today's 1
      const newY1 = dailyCandle ? [...priceHistory.y1.slice(1), dailyCandle] : priceHistory.y1;

      // y5 is weekly, only update if it's a week boundary (day % 7 === 0)
      let newY5 = priceHistory.y5;
      if (day % 7 === 0 && dailyCandle) {
        newY5 = [...priceHistory.y5.slice(1), dailyCandle];
      }

      priceHistoryUpdates[asset.id] = {
        priceHistory: {
          today: [], // Clear for next day
          yesterday: newYesterday, // Save today's candles as yesterday
          d5: newD5,
          m1: newM1,
          y1: newY1,
          y5: newY5,
        },
      };
    }

    // Apply price history updates
    if (Object.keys(priceHistoryUpdates).length > 0) {
      state.applyTickUpdates(priceHistoryUpdates);
    }

    // Save after tick processing and WAIT for it to complete
    await state.saveGame();

    // Set status to beginning-of-day for next day
    set({ simulationStatus: 'beginning-of-day' });

    // Ensure minimum loading time has elapsed
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime < minLoadingTime) {
      await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
    }
    set({ isProcessingDay: false });
  },

  // Load game state from IndexedDB
  // Simulate N days of gameplay to backfill data (prices, trades, news, events)
  simulateBackfill: async (days: number) => {
    console.log(`[rootStore] simulateBackfill START - ${days} days`);
    const state = get();

    // Enable simulation mode and trading to suppress UI updates
    set({ isSimulating: true, tradingStarted: true });

    const ticksPerDay = 1800;

    for (let d = 0; d < days; d++) {
      console.log(`[rootStore] Simulating day ${d + 1}/${days}...`);

      // Simulate all ticks for the day
      for (let t = 0; t < ticksPerDay; t++) {
        state.processTick();
      }

      // Advance to next day
      set({ day: state.day + 1, tick: 0 });
      await state.processDay();
    }

    // Reset to day 1 after backfill, keep all the generated history, disable trading
    set({ day: 1, tick: 0, isSimulating: false, tradingStarted: false });
    await state.saveGame();
    console.log('[rootStore] simulateBackfill COMPLETE - reset to day 1');
  },

  loadGame: async () => {
    console.log('[rootStore] loadGame START');
    const savedState = await loadGame();

    if (savedState) {
      console.log('[rootStore] loadGame - Found saved state, assets:', Object.keys(savedState.assets || {}).length);
      set((prevState) => ({ ...prevState, ...savedState }));

      // Set active profile ID in cache if profile exists
      if (savedState.profile?.id) {
        setActiveProfileId(savedState.profile.id);
        console.log('[rootStore] Set active profile ID:', savedState.profile.id);
      }

      console.log('[rootStore] loadGame COMPLETE');
    } else {
      console.log('[rootStore] loadGame - No saved state found');
    }
  },

  // Save current state to IndexedDB
  saveGame: async () => {
    const state = get();

    // Skip save if no changes since last save
    if (!state.isDirty) {
      console.log('[rootStore] saveGame SKIPPED - no changes');
      return;
    }

    console.log('[rootStore] saveGame START - assets:', Object.keys(state.assets || {}).length, 'list:', (state.list || []).length);
    await saveGame(state);
    set({ isDirty: false }); // Clear dirty flag after successful save
    console.log('[rootStore] saveGame COMPLETE');
  },
}));

// Subscribe to day changes to process game logic
let previousDay = -1; // Start at -1 so initial load doesn't trigger
let isProcessing = false;
let isInitialLoad = true;

useStore.subscribe((state) => {
  // Skip the first state update (initial load from IndexedDB)
  if (isInitialLoad) {
    previousDay = state.day;
    isInitialLoad = false;
    return;
  }

  // Only process day if day actually advanced (user clicked Next Day or Skip Days)
  if (state.day > previousDay && state.day > 0 && !isProcessing) {
    isProcessing = true;
    useStore.getState().processDay();
    isProcessing = false;
  }
  previousDay = state.day;
});
