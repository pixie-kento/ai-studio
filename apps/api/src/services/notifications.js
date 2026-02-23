import { getAdminPB } from './pocketbase.js';

export async function notifyUser(userId, workspaceId, { title, message, type, actionUrl, metadata }) {
  const pb = await getAdminPB();
  return pb.collection('notifications').create({
    workspace: workspaceId,
    user: userId,
    title,
    message,
    type: type || 'system',
    is_read: false,
    action_url: actionUrl || '',
    metadata: metadata || {},
  });
}

// Notify all owner + admin members of a workspace
export async function notifyWorkspace(workspaceId, { title, message, type, actionUrl, metadata }) {
  const pb = await getAdminPB();
  const members = await pb.collection('workspace_members').getFullList({
    filter: `workspace = "${workspaceId}" && (role = "owner" || role = "admin")`,
  });
  const promises = members.map(m =>
    notifyUser(m.user, workspaceId, { title, message, type, actionUrl, metadata })
  );
  return Promise.all(promises);
}

export default { notifyUser, notifyWorkspace };
