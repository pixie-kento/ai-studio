import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api.js';

export function useScenes(workspaceId, showId, episodeId) {
  return useQuery({
    queryKey: ['scenes', workspaceId, showId, episodeId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}/scenes`).then((r) => r.data),
    enabled: !!(workspaceId && showId && episodeId),
  });
}

export function useCreateScene(workspaceId, showId, episodeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post(
      `/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}/scenes`,
      payload,
    ).then((r) => r.data),
    onSuccess: () => {
      toast.success('Scene created');
      qc.invalidateQueries({ queryKey: ['scenes', workspaceId, showId, episodeId] });
      qc.invalidateQueries({ queryKey: ['pipeline', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create scene'),
  });
}

export function useUpdateScene(workspaceId, showId, episodeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sceneId, payload }) => api.patch(
      `/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}/scenes/${sceneId}`,
      payload,
    ).then((r) => r.data),
    onSuccess: () => {
      toast.success('Scene updated');
      qc.invalidateQueries({ queryKey: ['scenes', workspaceId, showId, episodeId] });
      qc.invalidateQueries({ queryKey: ['pipeline', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update scene'),
  });
}

export function useDeleteScene(workspaceId, showId, episodeId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sceneId) => api.delete(
      `/api/workspaces/${workspaceId}/shows/${showId}/episodes/${episodeId}/scenes/${sceneId}`,
    ).then((r) => r.data),
    onSuccess: () => {
      toast.success('Scene deleted');
      qc.invalidateQueries({ queryKey: ['scenes', workspaceId, showId, episodeId] });
      qc.invalidateQueries({ queryKey: ['pipeline', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to delete scene'),
  });
}

export default {
  useScenes,
  useCreateScene,
  useUpdateScene,
  useDeleteScene,
};
