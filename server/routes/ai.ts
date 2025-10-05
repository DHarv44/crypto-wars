/**
 * AI API Routes
 */

import { Router } from 'express';
import { classifyAndPack } from '../ai/classify';
import { composePost } from '../ai/compose';
import { improvePost } from '../ai/improve';

const router = Router();

// POST /api/ai/classify-and-pack
router.post('/classify-and-pack', async (req, res) => {
  try {
    const { text, mentions, seed } = req.body;

    if (!text || !seed) {
      return res.status(400).json({ error: 'Missing required fields: text, seed' });
    }

    const startTime = Date.now();
    const result = await classifyAndPack(text, mentions || [], seed);
    const latencyMs = Date.now() - startTime;

    res.json({
      ...result,
      _meta: {
        latencyMs,
        seed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in classify-and-pack:', error);
    res.status(500).json({ error: 'AI classification failed' });
  }
});

// POST /api/ai/compose
router.post('/compose', async (req, res) => {
  try {
    const { modeHint, assets, direction, timeframeDays, seed } = req.body;

    if (!seed) {
      return res.status(400).json({ error: 'Missing required field: seed' });
    }

    const startTime = Date.now();
    const result = await composePost(modeHint, assets, direction, timeframeDays, seed);
    const latencyMs = Date.now() - startTime;

    res.json({
      ...result,
      _meta: {
        latencyMs,
        seed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in compose:', error);
    res.status(500).json({ error: 'AI composition failed' });
  }
});

// POST /api/ai/improve
router.post('/improve', async (req, res) => {
  try {
    const { currentText, seed } = req.body;

    if (!currentText || !seed) {
      return res.status(400).json({ error: 'Missing required fields: currentText, seed' });
    }

    const startTime = Date.now();
    const result = await improvePost(currentText, seed);
    const latencyMs = Date.now() - startTime;

    res.json({
      ...result,
      _meta: {
        latencyMs,
        seed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in improve:', error);
    res.status(500).json({ error: 'AI improvement failed' });
  }
});

export default router;
