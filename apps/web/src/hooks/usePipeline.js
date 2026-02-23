import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

export function usePipelineHealth() {
  return useQuery({
    queryKey: ['pipeline-health'],
    queryFn: () => api.get('/api/pipeline/health').then(r => r.data),
    refetchInterval: 30000,
    retry: false,
  });
}

export function useWorkspacePipeline(workspaceId) {
  return useQuery({
    queryKey: ['pipeline', workspaceId],
    queryFn: () => api.get(`/api/pipeline/workspace/${workspaceId}`).then(r => r.data),
    enabled: !!workspaceId,
    refetchInterval: 10000,
  });
}

export function useGlobalQueue() {
  return useQuery({
    queryKey: ['pipeline-global-queue'],
    queryFn: () => api.get('/api/pipeline/queue').then(r => r.data),
    refetchInterval: 10000,
  });
}

export default { usePipelineHealth, useWorkspacePipeline, useGlobalQueue };
