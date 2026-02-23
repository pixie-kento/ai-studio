import { getAdminPB } from '../services/pocketbase.js';
import { ForbiddenError, NotFoundError } from './errorHandler.js';

// Injects req.workspace and req.workspaceMember
export async function requireWorkspace(req, res, next) {
  try {
    const workspaceId = req.params.wid || req.params.workspaceId;
    if (!workspaceId) return next();

    const pb = await getAdminPB();
    const workspace = await pb.collection('workspaces').getOne(workspaceId).catch(err => {
      if (err?.status === 404) return null;
      throw err; // propagate auth/connectivity errors instead of hiding them
    });
    if (!workspace) throw new NotFoundError('Workspace');

    // Find membership
    const member = await pb.collection('workspace_members').getFirstListItem(
      `workspace = "${workspaceId}" && user = "${req.user.id}"`
    ).catch(() => null);

    // Superadmin can access any workspace
    if (!member && req.user.platform_role !== 'superadmin') {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    req.workspace = workspace;
    req.workspaceMember = member;
    next();
  } catch (err) {
    next(err);
  }
}

export default { requireWorkspace };
