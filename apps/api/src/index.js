import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env first, then allow apps/api/.env to override per-service values.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

// Routes
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import showRoutes from './routes/shows.js';
import characterRoutes from './routes/characters.js';
import characterProductionRoutes from './routes/characterProduction.js';
import episodeRoutes from './routes/episodes.js';
import showProductionRoutes from './routes/showProduction.js';
import voiceActorRoutes from './routes/voiceActors.js';
import sceneRoutes from './routes/scenes.js';
import pipelineRoutes from './routes/pipeline.js';
import billingRoutes from './routes/billing.js';
import webhookRoutes from './routes/webhooks.js';
import notificationRoutes from './routes/notifications.js';
import superadminRoutes from './routes/superadmin.js';
import reviewRoutes from './routes/review.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';

// Workers & Scheduler
import { startRenderWorker } from './workers/renderWorker.js';
import { startSchedulerSync, startMonthlyReset } from './services/scheduler.js';
import { ensurePlanLimitsSeeded } from './services/planLimits.js';
import { ensureProductionCollections } from './services/productionCollections.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security & parsing
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Raw body for Stripe webhooks (must be before json middleware)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// JSON parsing for everything else
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
app.use('/api/auth', authRoutes);

// Workspace-scoped routes
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:wid/voice-actors', voiceActorRoutes);
app.use('/api/workspaces/:wid/shows', showRoutes);
app.use('/api/workspaces/:wid/shows/:sid/characters', characterRoutes);
app.use('/api/workspaces/:wid/shows/:sid/characters/:cid/production', characterProductionRoutes);
app.use('/api/workspaces/:wid/shows/:sid/production', showProductionRoutes);
app.use('/api/workspaces/:wid/shows/:sid/episodes', episodeRoutes);
app.use('/api/workspaces/:wid/shows/:sid/episodes/:eid/scenes', sceneRoutes);

// Review
app.use('/api', reviewRoutes);

// Pipeline
app.use('/api/pipeline', pipelineRoutes);

// Billing
app.use('/api/billing', billingRoutes);

// Webhooks
app.use('/api/webhooks', webhookRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Super Admin
app.use('/api/superadmin', superadminRoutes);

// AI utilities
app.post('/api/ai/show-names', async (req, res, next) => {
  try {
    const { generateShowNameSuggestions } = await import('./services/ai.js');
    const suggestions = await generateShowNameSuggestions(req.body.description || '');
    res.json({ suggestions });
  } catch (err) { next(err); }
});

app.post('/api/ai/character-description', async (req, res, next) => {
  try {
    const { generateCharacterDescription } = await import('./services/ai.js');
    const { name, age, traits = [] } = req.body;
    const description = await generateCharacterDescription(name, age, traits);
    res.json(description);
  } catch (err) { next(err); }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: { message: `Route ${req.method} ${req.path} not found` } });
});

// Global error handler
app.use(errorHandler);

async function bootstrap() {
  try {
    const productionCollections = await ensureProductionCollections();
    if (productionCollections.created > 0) {
      console.log(`[api] production collections ensured (${productionCollections.created}/${productionCollections.total} created)`);
    }
  } catch (err) {
    console.error('[api] production collections setup failed:', err.message);
  }

  try {
    const seeded = await ensurePlanLimitsSeeded();
    if (seeded.created > 0 || seeded.updated > 0) {
      console.log(`[api] plan_limits synced (${seeded.created} created, ${seeded.updated} updated)`);
    }
  } catch (err) {
    console.error('[api] plan_limits sync failed:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[api] StudioAI API running on http://localhost:${PORT}`);

    // Start Bull render worker
    startRenderWorker();

    // Start episode schedulers
    startSchedulerSync();
    startMonthlyReset();
  });
}

bootstrap();

export default app;
