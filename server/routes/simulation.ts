/**
 * Simulation API - Run game simulation for backfill data
 */

import { Router } from 'express';

const router = Router();

/**
 * POST /api/simulation/run
 * Run N days of game simulation
 */
router.post('/run', async (req, res) => {
  const { gameState, days = 5 } = req.body;

  if (!gameState) {
    return res.status(400).json({ error: 'gameState required' });
  }

  try {
    console.log(`[Simulation] Starting ${days} day simulation...`);
    console.log('[Simulation] Player state:', JSON.stringify(gameState.player, null, 2));
    const startTime = Date.now();

    // Import game engine functions
    const { executeTick } = await import('../../src/engine/tick');
    const { rollDailyNews, applyNewsImpact } = await import('../../src/engine/news');

    let state = { ...gameState };
    const ticksPerDay = 1800;
    let totalTrades = 0;

    // Enable trading for simulation
    state.tradingStarted = true;

    for (let d = 0; d < days; d++) {
      console.log(`[Simulation] Day ${d + 1}/${days}...`);
      let dayTrades = 0;

      // Run all ticks for the day
      for (let t = 0; t < ticksPerDay; t++) {
        const updates = executeTick(state.tick, state.assets, state.player, state.devMode, []);

        // Count trades
        for (const [assetId, update] of Object.entries(updates)) {
          if (update.priceHistory?.today) {
            const asset = state.assets[assetId];
            const prevLength = asset?.priceHistory?.today?.length || 0;
            const newLength = update.priceHistory.today.length;
            if (newLength > prevLength) {
              dayTrades++;
              totalTrades++;
            }
          }
        }

        // Apply updates
        for (const [assetId, update] of Object.entries(updates)) {
          state.assets[assetId] = { ...state.assets[assetId], ...update };
        }

        state.tick++;
      }

      console.log(`[Simulation] Day ${d + 1} complete - ${dayTrades} trades executed`);

      // Process day (news, events, aggregate candles)
      const news = rollDailyNews(state.assets, state.day + 1);
      console.log(`[Simulation] Generated ${news.length} news articles`);

      // Apply news impacts
      for (const article of news) {
        const impact = applyNewsImpact(article, state.assets);
        for (const [assetId, update] of Object.entries(impact)) {
          state.assets[assetId] = { ...state.assets[assetId], ...update };
        }
      }

      // Aggregate today's trades into yesterday
      for (const asset of Object.values(state.assets) as any[]) {
        const today = asset.priceHistory?.today || [];
        if (today.length > 0) {
          // Create 6 aggregated candles
          const candlesPerDay = 6;
          const ticksPerCandle = 300;
          const aggregated: any[] = [];

          for (let i = 0; i < candlesPerDay; i++) {
            const startTick = i * ticksPerCandle;
            const endTick = startTick + ticksPerCandle;
            const periodTrades = today.filter((t: any) => t.tick >= startTick && t.tick < endTick);

            if (periodTrades.length > 0) {
              aggregated.push({
                tick: startTick,
                day: state.day,
                open: periodTrades[0].open,
                high: Math.max(...periodTrades.map((t: any) => t.high)),
                low: Math.min(...periodTrades.map((t: any) => t.low)),
                close: periodTrades[periodTrades.length - 1].close,
              });
            }
          }

          asset.priceHistory.yesterday = aggregated.map((c: any) => ({ ...c, day: -1 }));
          asset.priceHistory.d5 = [...(asset.priceHistory.d5 || []), ...aggregated].slice(-30);
          asset.priceHistory.today = [];
        }
      }

      // Advance day
      state.day++;
      state.tick = 0;
    }

    // Reset to day 1, disable trading
    state.day = 1;
    state.tick = 0;
    state.tradingStarted = false;

    const elapsed = Date.now() - startTime;
    console.log(`[Simulation] Complete! ${totalTrades} trades in ${elapsed}ms`);

    res.json({
      success: true,
      stats: {
        days,
        totalTrades,
        elapsed,
      },
      gameState: state,
    });
  } catch (error: any) {
    console.error('[Simulation] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
