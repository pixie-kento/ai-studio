import { Router } from 'express';
import { getAdminPB } from '../services/pocketbase.js';
import { getStripe } from '../services/stripe.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roles.js';
import { getRenderQueue } from '../services/queue.js';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

// GET /api/superadmin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const [workspaces, users, episodes, renderJobs] = await Promise.all([
      pb.collection('workspaces').getList(1, 1),
      pb.collection('users').getList(1, 1),
      pb.collection('episodes').getList(1, 1, { filter: 'status = "PUBLISHED"' }),
      pb.collection('render_jobs').getList(1, 1, { filter: 'status = "running"' }),
    ]);

    // Get MRR from Stripe (basic approximation)
    let mrr = 0;
    try {
      const stripe = getStripe();
      const subs = await stripe.subscriptions.list({ status: 'active', limit: 100 });
      for (const sub of subs.data) {
        for (const item of sub.items.data) {
          if (item.price.recurring?.interval === 'month') {
            mrr += item.price.unit_amount * item.quantity;
          } else if (item.price.recurring?.interval === 'year') {
            mrr += Math.floor((item.price.unit_amount * item.quantity) / 12);
          }
        }
      }
    } catch {}

    res.json({
      total_workspaces: workspaces.totalItems,
      total_users: users.totalItems,
      published_episodes: episodes.totalItems,
      active_renders: renderJobs.totalItems,
      mrr_cents: mrr,
    });
  } catch (err) { next(err); }
});

// GET /api/superadmin/workspaces
router.get('/workspaces', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const { page = 1, perPage = 20, search } = req.query;
    let filter = '';
    if (search) filter = `name ~ "${search}"`;
    const workspaces = await pb.collection('workspaces').getList(Number(page), Number(perPage), {
      filter: filter || undefined,
      sort: '-@rowid',
      expand: 'owner',
    });
    res.json(workspaces);
  } catch (err) { next(err); }
});

// GET /api/superadmin/workspaces/:id
router.get('/workspaces/:id', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const workspace = await pb.collection('workspaces').getOne(req.params.id, { expand: 'owner' });
    const [shows, episodes, members] = await Promise.all([
      pb.collection('shows').getList(1, 100, { filter: `workspace = "${req.params.id}"` }),
      pb.collection('episodes').getList(1, 1, { filter: `workspace = "${req.params.id}"` }),
      pb.collection('workspace_members').getList(1, 100, { filter: `workspace = "${req.params.id}"`, expand: 'user' }),
    ]);
    res.json({
      workspace,
      shows_count: shows.totalItems,
      episodes_count: episodes.totalItems,
      members_count: members.totalItems,
      recent_shows: shows.items.slice(0, 5),
    });
  } catch (err) { next(err); }
});

// GET /api/superadmin/render-queue
router.get('/render-queue', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const jobs = await pb.collection('render_jobs').getFullList({
      sort: '-priority,-@rowid',
      expand: 'episode,workspace,show',
    });
    const queue = getRenderQueue();
    const [waiting, active, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getFailed(),
    ]);
    res.json({
      db_jobs: jobs,
      queue_waiting: waiting.length,
      queue_active: active.length,
      queue_failed: failed.length,
    });
  } catch (err) { next(err); }
});

// DELETE /api/superadmin/render-jobs/:id
router.delete('/render-jobs/:id', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const job = await pb.collection('render_jobs').getOne(req.params.id);
    await pb.collection('render_jobs').update(req.params.id, { status: 'cancelled' });
    await pb.collection('episodes').update(job.episode, { status: 'RENDER_FAILED' });

    // Try to remove from Bull queue
    const queue = getRenderQueue();
    try {
      const bullJob = await queue.getJob(job.render_server_job_id);
      if (bullJob) await bullJob.remove();
    } catch {}

    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/superadmin/render-server
router.post('/render-server', async (req, res, next) => {
  try {
    const { url, api_key, callback_key } = req.body;
    if (url) process.env.RENDER_SERVER_URL = url;
    if (api_key) process.env.RENDER_API_KEY = api_key;
    if (callback_key) process.env.RENDER_SERVER_CALLBACK_KEY = callback_key;
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/superadmin/settings
router.get('/settings', (req, res) => {
  res.json({
    renderServer: { url: process.env.RENDER_SERVER_URL || '' },
    openai: { model: process.env.OPENAI_MODEL || 'gpt-4o' },
    stripe: { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '' },
  });
});

// POST /api/superadmin/settings/openai
router.post('/settings/openai', (req, res) => {
  const { key, model } = req.body;
  if (key) process.env.OPENAI_API_KEY = key;
  if (model) process.env.OPENAI_MODEL = model;
  res.json({ success: true });
});

// POST /api/superadmin/settings/stripe
router.post('/settings/stripe', (req, res) => {
  const { publishable, secret, webhookSecret } = req.body;
  if (publishable) process.env.STRIPE_PUBLISHABLE_KEY = publishable;
  if (secret) process.env.STRIPE_SECRET_KEY = secret;
  if (webhookSecret) process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  res.json({ success: true, message: 'Restart API server to apply Stripe changes.' });
});

// POST /api/superadmin/render-queue/clear-stuck
router.post('/render-queue/clear-stuck', async (req, res, next) => {
  try {
    const { getRenderQueue } = await import('../services/queue.js');
    const queue = getRenderQueue();
    const active = await queue.getActive();
    const THIRTY_MIN = 30 * 60 * 1000;
    const now = Date.now();
    let cleared = 0;
    for (const job of active) {
      if (job.processedOn && now - job.processedOn > THIRTY_MIN) {
        await job.moveToFailed({ message: 'Cleared by superadmin (stuck > 30 min)' }, true);
        cleared++;
      }
    }
    res.json({ success: true, cleared });
  } catch (err) { next(err); }
});

export default router;
