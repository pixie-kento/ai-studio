import { Router } from 'express';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireRole } from '../middleware/roles.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

// GET /api/workspaces/:wid/review — review queue for workspace
router.get('/workspaces/:wid/review', requireWorkspace, requireRole('reviewer'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const episodes = await pb.collection('episodes').getFullList({
      filter: `workspace = "${req.params.wid}" && status = "AWAITING_APPROVAL"`,
      sort: '-@rowid',
      expand: 'show',
    });
    res.json(episodes);
  } catch (err) { next(err); }
});

export default router;
