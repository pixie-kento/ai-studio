import { Router } from 'express';
import axios from 'axios';
import { getAdminPB } from '../services/pocketbase.js';
import { getRenderQueue } from '../services/queue.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireSuperAdmin } from '../middleware/roles.js';

const router = Router();
router.use(requireAuth);

// GET /api/pipeline/health
router.get('/health', async (req, res, next) => {
  try {
    const renderUrl = process.env.RENDER_SERVER_URL;
    if (!renderUrl) return res.json({ status: 'not_configured', online: false });

    const response = await axios.get(`${renderUrl}/health`, {
      timeout: 5000,
      headers: { 'X-API-Key': process.env.RENDER_API_KEY },
    }).catch(() => null);

    res.json({
      status: response?.data?.status || 'offline',
      online: !!response,
      url: renderUrl,
      last_checked: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

// GET /api/pipeline/queue — global render queue (superadmin)
router.get('/queue', requireSuperAdmin, async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const jobs = await pb.collection('render_jobs').getFullList({
      filter: 'status = "queued" || status = "running"',
      sort: '-priority,-@rowid',
      expand: 'episode,workspace,show',
    });
    res.json(jobs);
  } catch (err) { next(err); }
});

// GET /api/pipeline/workspace/:wid
router.get('/workspace/:wid', requireWorkspace, async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const jobs = await pb.collection('render_jobs').getFullList({
      filter: `workspace = "${req.params.wid}"`,
      sort: '-@rowid',
      expand: 'episode,show',
    });
    res.json(jobs);
  } catch (err) { next(err); }
});

// POST /api/pipeline/render-server — update render server URL (superadmin)
router.post('/render-server', requireSuperAdmin, async (req, res, next) => {
  try {
    const { url, api_key } = req.body;
    if (url) process.env.RENDER_SERVER_URL = url;
    if (api_key) process.env.RENDER_API_KEY = api_key;
    res.json({ success: true, url: process.env.RENDER_SERVER_URL });
  } catch (err) { next(err); }
});

export default router;
