import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api.js';

export function useEpisodes(workspaceId, showId, params = {}) {
  return useQuery({
    queryKey: ['episodes', workspaceId, showId, params],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows/${showId}/episodes`, { params }).then(r => r.data),
    enabled: !!(workspaceId && showId),
  });
}

export function useEpisode(workspaceId, showId, episodeId) {
  return useQuery({
    queryKey: ['episode', workspaceId, showId, episodeId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}`).then(r => r.data),
    enabled: !!(workspaceId && showId && episodeId),
  });
}

export function useEpisodeLogs(workspaceId, showId, episodeId) {
  return useQuery({
    queryKey: ['episode-logs', episodeId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}/logs`).then(r => r.data),
    enabled: !!(workspaceId && showId && episodeId),
    refetchInterval: 10000,
  });
}

export function useApproveEpisode(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (episodeId) => api.post(`/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}/approve`).then(r => r.data),
    onSuccess: (_, episodeId) => {
      toast.success('Episode approved and published!');
      qc.invalidateQueries({ queryKey: ['episode', workspaceId, showId, episodeId] });
      qc.invalidateQueries({ queryKey: ['episodes', workspaceId, showId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Approval failed'),
  });
}

export function useRejectEpisode(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ episodeId, reason }) =>
      api.post(`/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}/reject`, { reason }).then(r => r.data),
    onSuccess: (_, { episodeId }) => {
      toast.success('Episode rejected');
      qc.invalidateQueries({ queryKey: ['episode', workspaceId, showId, episodeId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Rejection failed'),
  });
}

export function useDeleteEpisode(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (episodeId) => api.delete(`/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}`).then((r) => r.data),
    onSuccess: (_, episodeId) => {
      toast.success('Episode deleted');
      qc.invalidateQueries({ queryKey: ['episodes', workspaceId, showId] });
      qc.invalidateQueries({ queryKey: ['episode', workspaceId, showId, episodeId] });
      qc.invalidateQueries({ queryKey: ['pipeline', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Delete failed'),
  });
}

export function useGenerateScenes(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (episodeId) => api.post(
      `/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}/generate-scenes`,
    ).then((r) => r.data),
    onSuccess: (_, episodeId) => {
      toast.success('Scene storyboard generated');
      qc.invalidateQueries({ queryKey: ['episode', workspaceId, showId, episodeId] });
      qc.invalidateQueries({ queryKey: ['pipeline', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to generate scenes'),
  });
}

export function useQueueRender(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (episodeId) => api.post(
      `/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}/queue-render`,
    ).then((r) => r.data),
    onSuccess: (_, episodeId) => {
      toast.success('Episode queued for render');
      qc.invalidateQueries({ queryKey: ['episode', workspaceId, showId, episodeId] });
      qc.invalidateQueries({ queryKey: ['episodes', workspaceId, showId] });
      qc.invalidateQueries({ queryKey: ['pipeline', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to queue render'),
  });
}

export function useReviewQueue(workspaceId) {
  return useQuery({
    queryKey: ['review-queue', workspaceId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/review`).then(r => r.data),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}

export default {
  useEpisodes,
  useEpisode,
  useEpisodeLogs,
  useApproveEpisode,
  useRejectEpisode,
  useDeleteEpisode,
  useGenerateScenes,
  useQueueRender,
  useReviewQueue,
};
