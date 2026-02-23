import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api.js';

function isFormDataPayload(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function withPayloadConfig(payload) {
  if (!isFormDataPayload(payload)) return undefined;
  return { headers: { 'Content-Type': 'multipart/form-data' } };
}

export function useCharacters(workspaceId, showId) {
  return useQuery({
    queryKey: ['characters', workspaceId, showId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows/${showId}/characters`).then(r => r.data),
    enabled: !!(workspaceId && showId),
  });
}

export function useCharacter(workspaceId, showId, characterId) {
  return useQuery({
    queryKey: ['character', workspaceId, showId, characterId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows/${showId}/characters/${characterId}`).then(r => r.data),
    enabled: !!(workspaceId && showId && characterId),
  });
}

export function useCreateCharacter(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(
      `/api/workspaces/${workspaceId}/shows/${showId}/characters`,
      data,
      withPayloadConfig(data),
    ).then(r => r.data),
    onSuccess: () => {
      toast.success('Character created!');
      qc.invalidateQueries({ queryKey: ['characters', workspaceId, showId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create character'),
  });
}

export function useUpdateCharacter(workspaceId, showId, characterId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch(
      `/api/workspaces/${workspaceId}/shows/${showId}/characters/${characterId}`,
      data,
      withPayloadConfig(data),
    ).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['character', workspaceId, showId, characterId] });
      qc.invalidateQueries({ queryKey: ['characters', workspaceId, showId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Update failed'),
  });
}

export function useDeleteCharacter(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (characterId) => api.delete(`/api/workspaces/${workspaceId}/shows/${showId}/characters/${characterId}`).then(r => r.data),
    onSuccess: (_, characterId) => {
      toast.success('Character archived');
      qc.invalidateQueries({ queryKey: ['characters', workspaceId, showId] });
      qc.invalidateQueries({ queryKey: ['character', workspaceId, showId, characterId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Delete failed'),
  });
}

export function useGeneratePrompts(workspaceId, showId, characterId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/api/workspaces/${workspaceId}/shows/${showId}/characters/${characterId}/generate-prompts`).then(r => r.data),
    onSuccess: () => {
      toast.success('ComfyUI prompts generated!');
      qc.invalidateQueries({ queryKey: ['character', workspaceId, showId, characterId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to generate prompts'),
  });
}

export default {
  useCharacters,
  useCharacter,
  useCreateCharacter,
  useUpdateCharacter,
  useDeleteCharacter,
  useGeneratePrompts,
};
