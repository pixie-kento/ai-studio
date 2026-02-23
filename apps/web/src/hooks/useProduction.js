import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api.js';

function isFormDataPayload(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function withPayloadConfig(payload) {
  if (!isFormDataPayload(payload)) return undefined;
  return { headers: { 'Content-Type': 'multipart/form-data' } };
}

export function useVoiceActors(workspaceId) {
  return useQuery({
    queryKey: ['voice-actors', workspaceId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/voice-actors`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useCreateVoiceActor(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(
      `/api/workspaces/${workspaceId}/voice-actors`,
      data,
      withPayloadConfig(data),
    ).then((r) => r.data),
    onSuccess: () => {
      toast.success('Voice actor created');
      qc.invalidateQueries({ queryKey: ['voice-actors', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create voice actor'),
  });
}

export function useUpdateVoiceActor(workspaceId, voiceActorId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch(
      `/api/workspaces/${workspaceId}/voice-actors/${voiceActorId}`,
      data,
      withPayloadConfig(data),
    ).then((r) => r.data),
    onSuccess: () => {
      toast.success('Voice actor updated');
      qc.invalidateQueries({ queryKey: ['voice-actors', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update voice actor'),
  });
}

export function useDeleteVoiceActor(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (voiceActorId) => api.delete(`/api/workspaces/${workspaceId}/voice-actors/${voiceActorId}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Voice actor removed');
      qc.invalidateQueries({ queryKey: ['voice-actors', workspaceId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to remove voice actor'),
  });
}

export function useShowProductionProfile(workspaceId, showId) {
  return useQuery({
    queryKey: ['show-production-profile', workspaceId, showId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows/${showId}/production`).then((r) => r.data),
    enabled: !!(workspaceId && showId),
  });
}

export function useUpdateShowProductionProfile(workspaceId, showId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch(`/api/workspaces/${workspaceId}/shows/${showId}/production`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Production profile saved');
      qc.invalidateQueries({ queryKey: ['show-production-profile', workspaceId, showId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to save production profile'),
  });
}

export function useCharacterProduction(workspaceId, showId, characterId) {
  return useQuery({
    queryKey: ['character-production', workspaceId, showId, characterId],
    queryFn: () => api.get(`/api/workspaces/${workspaceId}/shows/${showId}/characters/${characterId}/production`).then((r) => r.data),
    enabled: !!(workspaceId && showId && characterId),
  });
}

export function useUpdateCharacterVoice(workspaceId, showId, characterId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch(
      `/api/workspaces/${workspaceId}/shows/${showId}/characters/${characterId}/production/voice`,
      data,
    ).then((r) => r.data),
    onSuccess: () => {
      toast.success('Voice assignment saved');
      qc.invalidateQueries({ queryKey: ['character-production', workspaceId, showId, characterId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to save voice assignment'),
  });
}

export function useCreateEmotionReference(workspaceId, showId, characterId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(
      `/api/workspaces/${workspaceId}/shows/${showId}/characters/${characterId}/production/emotion-refs`,
      data,
      withPayloadConfig(data),
    ).then((r) => r.data),
    onSuccess: () => {
      toast.success('Emotion reference uploaded');
      qc.invalidateQueries({ queryKey: ['character-production', workspaceId, showId, characterId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to upload emotion reference'),
  });
}

export function useDeleteEmotionReference(workspaceId, showId, characterId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (refId) => api.delete(
      `/api/workspaces/${workspaceId}/shows/${showId}/characters/${characterId}/production/emotion-refs/${refId}`,
    ).then((r) => r.data),
    onSuccess: () => {
      toast.success('Emotion reference removed');
      qc.invalidateQueries({ queryKey: ['character-production', workspaceId, showId, characterId] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to remove emotion reference'),
  });
}

export default {
  useVoiceActors,
  useCreateVoiceActor,
  useUpdateVoiceActor,
  useDeleteVoiceActor,
  useShowProductionProfile,
  useUpdateShowProductionProfile,
  useCharacterProduction,
  useUpdateCharacterVoice,
  useCreateEmotionReference,
  useDeleteEmotionReference,
};
