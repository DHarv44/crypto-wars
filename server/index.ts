/**
 * Express Server for AI Endpoints
 * Runs alongside Vite dev server
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/ai';
import simulationRoutes from './routes/simulation';

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI routes
app.use('/api/ai', aiRoutes);

// Simulation routes
app.use('/api/simulation', simulationRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Server running on http://localhost:${PORT}`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - AI endpoints: /api/ai/*`);

  if (!process.env.CLAUDE_API_KEY) {
    console.warn('\n⚠️  CLAUDE_API_KEY not set. Using fallback templates.\n');
  }
});
