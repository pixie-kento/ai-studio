import { Router } from 'express';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';

const router = Router();
router.use(requireAuth);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const { workspaceId, unread } = req.query;
    const pb = await getAdminPB();
    let filter = `user = "${req.user.id}"`;
    if (workspaceId) filter += ` && workspace = "${workspaceId}"`;
    if (unread === 'true') filter += ` && is_read = false`;

    const notifications = await pb.collection('notifications').getList(1, 50, {
      filter,
      sort: '-@rowid',
    });
    res.json(notifications);
  } catch (err) { next(err); }
});

// GET /api/notifications/count
router.get('/count', async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    const pb = await getAdminPB();
    let filter = `user = "${req.user.id}" && is_read = false`;
    if (workspaceId) filter += ` && workspace = "${workspaceId}"`;
    const result = await pb.collection('notifications').getList(1, 1, { filter });
    res.json({ count: result.totalItems });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const notification = await pb.collection('notifications').update(req.params.id, { is_read: true });
    res.json(notification);
  } catch (err) { next(err); }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res, next) => {
  try {
    const { workspaceId } = req.body;
    const pb = await getAdminPB();
    let filter = `user = "${req.user.id}" && is_read = false`;
    if (workspaceId) filter += ` && workspace = "${workspaceId}"`;
    const unread = await pb.collection('notifications').getFullList({ filter, fields: 'id' });
    await Promise.all(unread.map(n => pb.collection('notifications').update(n.id, { is_read: true })));
    res.json({ success: true, updated: unread.length });
  } catch (err) { next(err); }
});

export default router;
