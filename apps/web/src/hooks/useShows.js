import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api.js';

export function useShows(workspaceId) {
  return useQuery({
    queryKey: ['shows', workspaceId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows`).then(r => r.data),
    enabled: !!workspaceId,
  });
}

export function useShow(workspaceId, showId) {
  return useQuery({
    queryKey: ['show', workspaceId, showId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows/${showId}`).then(r => r.data),
    enabled: !!(workspaceId && showId),
  });
}

export function useCreateShow(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/api/workspaces/${workspaceId}/shows`, data).then(r => r.data),
    onSuccess: () => {
      toast.success('Show created!');
      qc.invalidateQueries({ queryKey: ['shows', workspaceId] });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to create show';
      toast.error(msg);
      if (err.response?.status === 402) {
        // Plan limit hit - handled by UpgradePrompt
      }
    },
  });
}

export function useUpdateShow(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch(`/api/workspaces/${workspaceId}/shows/${showId}`, data).then(r => r.data),
    onSuccess: () => {
      toast.success('Show updated');
      qc.invalidateQueries({ queryKey: ['show', workspaceId, showId] });
      qc.invalidateQueries({ queryKey: ['shows', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Update failed'),
  });
}

export function useDeleteShow(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/api/workspaces/${workspaceId}/shows/${showId}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Show archived');
      qc.invalidateQueries({ queryKey: ['shows', workspaceId] });
      qc.invalidateQueries({ queryKey: ['show', workspaceId, showId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to archive show'),
  });
}

export function useGenerateEpisode(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/api/workspaces/${workspaceId}/shows/${showId}/generate-episode`).then(r => r.data),
    onSuccess: () => {
      toast.success('Episode generation started!');
      qc.invalidateQueries({ queryKey: ['episodes', workspaceId, showId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to generate episode'),
  });
}

export default {
  useShows,
  useShow,
  useCreateShow,
  useUpdateShow,
  useDeleteShow,
  useGenerateEpisode,
};

