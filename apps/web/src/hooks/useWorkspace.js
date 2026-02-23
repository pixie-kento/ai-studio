import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import useWorkspaceStore from '../stores/workspaceStore.js';

export function useWorkspace(workspaceId) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}`).then(r => r.data),
    enabled: !!workspaceId,
  });
}

export function useWorkspaceUsage(workspaceId) {
  return useQuery({
    queryKey: ['workspace-usage', workspaceId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/usage`).then(r => r.data),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}

export function useWorkspaceMembers(workspaceId) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/members`).then(r => r.data),
    enabled: !!workspaceId,
  });
}

export function useUpdateWorkspace(workspaceId) {
  const qc = useQueryClient();
  const { setWorkspace } = useWorkspaceStore();
  return useMutation({
    mutationFn: (data) => api.patch(`/api/workspaces/${workspaceId}`, data).then(r => r.data),
    onSuccess: (workspace) => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      setWorkspace(workspace);
    },
  });
}

export function useInviteMember(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/api/workspaces/${workspaceId}/members/invite`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }),
  });
}

export function useUpdateMember(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }) => api.patch(`/api/workspaces/${workspaceId}/members/${memberId}`, { role }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }),
  });
}

export function useRemoveMember(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId) => api.delete(`/api/workspaces/${workspaceId}/members/${memberId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }),
  });
}

export default { useWorkspace, useWorkspaceUsage, useWorkspaceMembers, useUpdateWorkspace };
