import { useState } from 'react';
import { Plus, Loader2, Trash2, Shield, Crown, Eye, Edit2, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWorkspaceMembers, useInviteMember, useUpdateMember, useRemoveMember } from '../../hooks/useWorkspace.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import useAuthStore from '../../stores/authStore.js';
import { usePlan } from '../../hooks/usePlan.js';
import { UpgradePromptInline } from '../../components/shared/UpgradePrompt.jsx';
import { formatDate } from '../../lib/utils.js';

const ROLES = [
  { value: 'admin', label: 'Admin', icon: Shield, desc: 'Full access except billing' },
  { value: 'reviewer', label: 'Reviewer', icon: UserCheck, desc: 'Approve/reject episodes' },
  { value: 'creator', label: 'Creator', icon: Edit2, desc: 'Create and edit content' },
  { value: 'viewer', label: 'Viewer', icon: Eye, desc: 'View-only access' },
];

const ROLE_ICONS = { owner: Crown, admin: Shield, reviewer: UserCheck, creator: Edit2, viewer: Eye };
const ROLE_COLORS = {
  owner: 'bg-amber-100 text-amber-700',
  admin: 'bg-purple-100 text-purple-700',
  reviewer: 'bg-blue-100 text-blue-700',
  creator: 'bg-green-100 text-green-700',
  viewer: 'bg-slate-100 text-slate-600',
};

export default function TeamSettings() {
  const { activeWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { data: members, isLoading } = useWorkspaceMembers(activeWorkspace?.id);
  const invite = useInviteMember(activeWorkspace?.id);
  const updateMember = useUpdateMember(activeWorkspace?.id);
  const removeMember = useRemoveMember(activeWorkspace?.id);
  const { limits } = usePlan();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('creator');
  const [showInvite, setShowInvite] = useState(false);

  const memberCount = members?.length || 0;
  const atLimit = limits.team_members !== -1 && memberCount >= limits.team_members;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await invite.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invited ${inviteEmail}`);
      setInviteEmail('');
      setShowInvite(false);
    } catch {
      toast.error('Failed to send invite');
    }
  };

  const handleRoleChange = async (memberId, role) => {
    try {
      await updateMember.mutateAsync({ memberId, role });
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemove = async (memberId, memberEmail) => {
    if (!confirm(`Remove ${memberEmail} from this workspace?`)) return;
    try {
      await removeMember.mutateAsync(memberId);
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const myMember = members?.find(m => m.expand?.user?.email === user?.email);
  const canManage = ['owner', 'admin'].includes(myMember?.role);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Team</h1>
          <p className="text-slate-500 text-sm mt-1">
            {memberCount} member{memberCount !== 1 ? 's' : ''}
            {limits.team_members !== -1 ? ` / ${limits.team_members} seats` : ''}
          </p>
        </div>
        {canManage && !atLimit && (
          <button onClick={() => setShowInvite(v => !v)} className="btn-primary">
            <Plus size={16} /> Invite Member
          </button>
        )}
      </div>

      {atLimit && (
        <UpgradePromptInline message={`You've reached the team limit for this plan (${limits.team_members} members).`} />
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="card space-y-4">
          <h2 className="font-bold text-slate-900">Invite a Team Member</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="input"
                placeholder="colleague@example.com"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="input"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleInvite} disabled={invite.isPending || !inviteEmail.trim()} className="btn-primary">
              {invite.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Send Invite
            </button>
            <button onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Role guide */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ROLES.map(r => {
          const Icon = r.icon;
          return (
            <div key={r.value} className="card p-3 text-center bg-slate-50 border border-slate-100">
              <Icon size={18} className="mx-auto mb-1 text-slate-500" />
              <p className="text-xs font-bold text-slate-700">{r.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Members table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse h-48" />
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Member</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden sm:table-cell">Joined</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(members || []).map(m => {
                const memberUser = m.expand?.user;
                const RoleIcon = ROLE_ICONS[m.role] || Eye;
                const isMe = memberUser?.email === user?.email;
                const isOwner = m.role === 'owner';

                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold text-sm flex-shrink-0">
                          {(memberUser?.display_name || memberUser?.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {memberUser?.display_name || 'Unnamed'}
                            {isMe && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                          </p>
                          <p className="text-xs text-slate-400">{memberUser?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canManage && !isOwner && !isMe ? (
                        <select
                          value={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-brand-purple"
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ROLE_COLORS[m.role] || ROLE_COLORS.viewer}`}>
                          <RoleIcon size={11} /> {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell">{formatDate(m.created)}</td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        {!isOwner && !isMe && (
                          <button
                            onClick={() => handleRemove(m.id, memberUser?.email)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
