import { Router } from 'express';
import { getAdminPB } from '../services/pocketbase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspace } from '../middleware/workspace.js';
import { requireRole } from '../middleware/roles.js';
import { checkTeamLimit } from '../middleware/planLimits.js';
import { getPlanLimitsForPlan } from '../services/planLimits.js';

const router = Router();
router.use(requireAuth);

// GET /api/workspaces — list user's workspaces
router.get('/', async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const members = await pb.collection('workspace_members').getFullList({
      filter: `user = "${req.user.id}"`,
      expand: 'workspace',
    });
    res.json(members.map(m => ({ ...m.expand?.workspace, role: m.role })));
  } catch (err) { next(err); }
});

// GET /api/workspaces/:wid
router.get('/:wid', requireWorkspace, async (req, res, next) => {
  try {
    const limits = await getPlanLimitsForPlan(req.workspace.plan, { autoCreate: true }).catch(() => null);
    res.json({ ...req.workspace, limits });
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid
router.patch('/:wid', requireWorkspace, requireRole('admin'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const { name, logo, render_server_url, render_api_key, openai_api_key } = req.body;
    const updated = await pb.collection('workspaces').update(req.params.wid, {
      ...(name && { name }),
      ...(logo && { logo }),
      ...(render_server_url !== undefined && { render_server_url }),
      ...(render_api_key !== undefined && { render_api_key }),
      ...(openai_api_key !== undefined && { openai_api_key }),
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// GET /api/workspaces/:wid/usage
router.get('/:wid/usage', requireWorkspace, async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const wid = req.params.wid;
    const [shows, members, limits] = await Promise.all([
      pb.collection('shows').getList(1, 1, { filter: `workspace = "${wid}" && status != "archived"` }),
      pb.collection('workspace_members').getList(1, 1, { filter: `workspace = "${wid}"` }),
      getPlanLimitsForPlan(req.workspace.plan, { autoCreate: true }),
    ]);
    res.json({
      shows_used: shows.totalItems,
      max_shows: limits.max_shows,
      episodes_this_month: req.workspace.episodes_this_month,
      episodes_per_month: limits.episodes_per_month,
      team_used: members.totalItems,
      max_team: limits.team_members,
      plan: req.workspace.plan,
      plan_status: req.workspace.plan_status,
    });
  } catch (err) { next(err); }
});

// GET /api/workspaces/:wid/members
router.get('/:wid/members', requireWorkspace, async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const members = await pb.collection('workspace_members').getFullList({
      filter: `workspace = "${req.params.wid}"`,
      expand: 'user',
    });
    res.json(members.map(m => ({
      id: m.id,
      role: m.role,
      joined_at: m.created,
      user: {
        id: m.expand?.user?.id,
        email: m.expand?.user?.email,
        display_name: m.expand?.user?.display_name,
        avatar: m.expand?.user?.avatar,
      },
    })));
  } catch (err) { next(err); }
});

// POST /api/workspaces/:wid/members/invite
router.post('/:wid/members/invite', requireWorkspace, requireRole('admin'), checkTeamLimit, async (req, res, next) => {
  try {
    const { email, role = 'creator' } = req.body;
    const pb = await getAdminPB();

    // Find user by email
    const users = await pb.collection('users').getList(1, 1, { filter: `email = "${email}"` });
    if (users.totalItems === 0) {
      return res.status(404).json({ error: { message: 'No user found with that email. They must register first.' } });
    }
    const invitedUser = users.items[0];

    // Check not already a member
    const existing = await pb.collection('workspace_members').getList(1, 1, {
      filter: `workspace = "${req.params.wid}" && user = "${invitedUser.id}"`,
    });
    if (existing.totalItems > 0) {
      return res.status(409).json({ error: { message: 'User is already a member' } });
    }

    const member = await pb.collection('workspace_members').create({
      workspace: req.params.wid,
      user: invitedUser.id,
      role,
      invited_by: req.user.id,
    });
    res.status(201).json(member);
  } catch (err) { next(err); }
});

// PATCH /api/workspaces/:wid/members/:uid
router.patch('/:wid/members/:uid', requireWorkspace, requireRole('admin'), async (req, res, next) => {
  try {
    const { role } = req.body;
    const pb = await getAdminPB();
    const member = await pb.collection('workspace_members').getFirstListItem(
      `workspace = "${req.params.wid}" && user = "${req.params.uid}"`
    );
    const updated = await pb.collection('workspace_members').update(member.id, { role });
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/:wid/members/:uid
router.delete('/:wid/members/:uid', requireWorkspace, requireRole('admin'), async (req, res, next) => {
  try {
    const pb = await getAdminPB();
    const member = await pb.collection('workspace_members').getFirstListItem(
      `workspace = "${req.params.wid}" && user = "${req.params.uid}"`
    );
    // Can't remove the owner
    if (member.role === 'owner') {
      return res.status(400).json({ error: { message: 'Cannot remove the workspace owner' } });
    }
    await pb.collection('workspace_members').delete(member.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
