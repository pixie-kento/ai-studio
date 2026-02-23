import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

export function useNotifications(workspaceId) {
  return useQuery({
    queryKey: ['notifications', workspaceId],
    queryFn: () => api.get('/api/notifications', { params: { workspaceId } }).then(r => r.data),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}

export function useNotificationCount(workspaceId) {
  return useQuery({
    queryKey: ['notification-count', workspaceId],
    queryFn: () => api.get('/api/notifications/count', { params: { workspaceId } }).then(r => r.data),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/api/notifications/${id}/read`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });
}

export function useMarkAllRead(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/notifications/read-all', { workspaceId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });
}

export default { useNotifications, useNotificationCount, useMarkRead, useMarkAllRead };
