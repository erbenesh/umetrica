import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSemanticCube,
  discardSemanticDraft,
  fetchSemanticCube,
  fetchSemanticCubes,
  fetchSemanticPublishPreview,
  fetchSemanticSchemaTables,
  publishSemanticCube,
  semanticCubeQueryKey,
  semanticCubesQueryKey,
  updateSemanticDraft,
} from '@/lib/semantic-api';

export function useSemanticCubes() {
  return useQuery({
    queryKey: semanticCubesQueryKey,
    queryFn: fetchSemanticCubes,
  });
}

export function useSemanticCube(name: string) {
  return useQuery({
    queryKey: semanticCubeQueryKey(name),
    queryFn: () => fetchSemanticCube(name),
    enabled: Boolean(name),
  });
}

export function useUpdateSemanticDraft(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSemanticDraft.bind(null, name),
    onSuccess: (data) => {
      queryClient.setQueryData(semanticCubeQueryKey(name), data);
      queryClient.invalidateQueries({ queryKey: semanticCubesQueryKey });
    },
  });
}

export function useDiscardSemanticDraft(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => discardSemanticDraft(name),
    onSuccess: (data) => {
      queryClient.setQueryData(semanticCubeQueryKey(name), data);
      queryClient.invalidateQueries({ queryKey: semanticCubesQueryKey });
    },
  });
}

export function useSemanticPublishPreview(name: string, enabled: boolean) {
  return useQuery({
    queryKey: [...semanticCubeQueryKey(name), 'publish-preview'],
    queryFn: () => fetchSemanticPublishPreview(name),
    enabled: enabled && Boolean(name),
  });
}

export function usePublishSemanticCube(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: publishSemanticCube.bind(null, name),
    onSuccess: (data) => {
      queryClient.setQueryData(semanticCubeQueryKey(name), data);
      queryClient.invalidateQueries({ queryKey: semanticCubesQueryKey });
    },
  });
}

export function useSemanticSchemaTables(connectionId?: string, enabled = true) {
  return useQuery({
    queryKey: ['semantic', 'schema', 'tables', connectionId ?? 'default'],
    queryFn: () => fetchSemanticSchemaTables(connectionId),
    enabled,
  });
}

export function useCreateSemanticCube() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSemanticCube,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semanticCubesQueryKey });
    },
  });
}
