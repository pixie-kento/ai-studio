import { getAdminPB } from '../services/pocketbase.js';
import { PlanLimitError } from './errorHandler.js';
import { getPlanLimitsForPlan } from '../services/planLimits.js';

async function getPlanLimits(workspaceId) {
  const pb = await getAdminPB();
  const workspace = await pb.collection('workspaces').getOne(workspaceId);
  const limits = await getPlanLimitsForPlan(workspace.plan);
  return { workspace, limits };
}

export async function checkShowLimit(req, res, next) {
  try {
    const workspaceId = req.params.wid || req.workspace?.id;
    if (!workspaceId) return next();
    const { workspace, limits } = await getPlanLimits(workspaceId);
    if (limits.max_shows === -1) return next();
    const pb = await getAdminPB();
    const count = await pb.collection('shows').getList(1, 1, {
      filter: `workspace = "${workspaceId}" && status != "archived"`,
    });
    if (count.totalItems >= limits.max_shows) {
      throw new PlanLimitError('show', limits.max_shows, workspace.plan);
    }
    next();
  } catch (err) { next(err); }
}

export async function checkCharacterLimit(req, res, next) {
  try {
    const workspaceId = req.params.wid || req.workspace?.id;
    const showId = req.params.sid;
    if (!workspaceId || !showId) return next();
    const { workspace, limits } = await getPlanLimits(workspaceId);
    if (limits.max_characters_per_show === -1) return next();
    const pb = await getAdminPB();
    const count = await pb.collection('characters').getList(1, 1, {
      filter: `show = "${showId}" && workspace = "${workspaceId}" && is_active = true`,
    });
    if (count.totalItems >= limits.max_characters_per_show) {
      throw new PlanLimitError('character', limits.max_characters_per_show, workspace.plan);
    }
    next();
  } catch (err) { next(err); }
}

export async function checkTeamLimit(req, res, next) {
  try {
    const workspaceId = req.params.wid || req.workspace?.id;
    if (!workspaceId) return next();
    const { workspace, limits } = await getPlanLimits(workspaceId);
    if (limits.team_members === -1) return next();
    const pb = await getAdminPB();
    const count = await pb.collection('workspace_members').getList(1, 1, {
      filter: `workspace = "${workspaceId}"`,
    });
    if (count.totalItems >= limits.team_members) {
      throw new PlanLimitError('team member', limits.team_members, workspace.plan);
    }
    next();
  } catch (err) { next(err); }
}

export default { checkShowLimit, checkCharacterLimit, checkTeamLimit };
