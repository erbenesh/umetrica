import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  applySemanticCubeYaml,
  applySemanticViewYaml,
  createSemanticCube,
  createSemanticView,
  deleteSemanticCube,
  deleteSemanticView,
  discardSemanticDraft,
  discardSemanticViewDraft,
  fetchCubeJoinContext,
  fetchSemanticCube,
  fetchSemanticCubeYaml,
  fetchSemanticCubes,
  fetchSemanticForeignKeys,
  fetchSemanticPublishPreview,
  fetchSemanticViewPublishPreview,
  fetchSemanticSchemaColumns,
  fetchSemanticSchemaTables,
  fetchSemanticView,
  fetchSemanticViewYaml,
  fetchSemanticViews,
  fetchSemanticWorkspace,
  previewSemanticQuery,
  publishSemanticCube,
  publishSemanticView,
  semanticCubeQueryKey,
  semanticCubesQueryKey,
  semanticViewQueryKey,
  semanticViewsQueryKey,
  semanticWorkspaceQueryKey,
  updateSemanticDraft,
  updateSemanticViewDraft,
  updateSemanticWorkspace,
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

export function useSemanticWorkspace() {
  return useQuery({
    queryKey: semanticWorkspaceQueryKey,
    queryFn: fetchSemanticWorkspace,
  });
}

export function useUpdateSemanticWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSemanticWorkspace,
    onSuccess: (data) => {
      queryClient.setQueryData(semanticWorkspaceQueryKey, (current: Awaited<ReturnType<typeof fetchSemanticWorkspace>> | undefined) =>
        current ? { ...current, layout: data.layout, updatedAt: data.updatedAt } : current
      );
    },
  });
}

export function useSemanticViews() {
  return useQuery({
    queryKey: semanticViewsQueryKey,
    queryFn: fetchSemanticViews,
  });
}

export function useSemanticView(name: string) {
  return useQuery({
    queryKey: semanticViewQueryKey(name),
    queryFn: () => fetchSemanticView(name),
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
      queryClient.invalidateQueries({ queryKey: semanticWorkspaceQueryKey });
    },
  });
}

export function useUpdateSemanticViewDraft(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSemanticViewDraft.bind(null, name),
    onSuccess: (data) => {
      queryClient.setQueryData(semanticViewQueryKey(name), data);
      queryClient.invalidateQueries({ queryKey: semanticViewsQueryKey });
      queryClient.invalidateQueries({ queryKey: semanticWorkspaceQueryKey });
    },
  });
}

export function useDiscardSemanticViewDraft(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => discardSemanticViewDraft(name),
    onSuccess: (data) => {
      queryClient.setQueryData(semanticViewQueryKey(name), data);
      queryClient.invalidateQueries({ queryKey: semanticViewsQueryKey });
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

export function useSemanticViewPublishPreview(name: string, enabled: boolean) {
  return useQuery({
    queryKey: [...semanticViewQueryKey(name), 'publish-preview'],
    queryFn: () => fetchSemanticViewPublishPreview(name),
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
      queryClient.invalidateQueries({ queryKey: semanticWorkspaceQueryKey });
    },
  });
}

export function usePublishSemanticView(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => publishSemanticView(name),
    onSuccess: (data) => {
      queryClient.setQueryData(semanticViewQueryKey(name), data);
      queryClient.invalidateQueries({ queryKey: semanticViewsQueryKey });
      queryClient.invalidateQueries({ queryKey: semanticWorkspaceQueryKey });
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

export function useSemanticSchemaColumns(table?: string, connectionId?: string) {
  return useQuery({
    queryKey: ['semantic', 'schema', 'columns', table, connectionId ?? 'default'],
    queryFn: () => fetchSemanticSchemaColumns(table!, connectionId),
    enabled: Boolean(table),
  });
}

export function useSemanticForeignKeys(connectionId?: string) {
  return useQuery({
    queryKey: ['semantic', 'schema', 'foreign-keys', connectionId ?? 'default'],
    queryFn: () => fetchSemanticForeignKeys(connectionId),
  });
}

export function useCubeJoinContext() {
  return useQuery({
    queryKey: ['semantic', 'join-context'],
    queryFn: fetchCubeJoinContext,
  });
}

export function useCreateSemanticCube() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSemanticCube,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semanticCubesQueryKey });
      queryClient.invalidateQueries({ queryKey: semanticWorkspaceQueryKey });
    },
  });
}

export function useCreateSemanticView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSemanticView,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semanticViewsQueryKey });
      queryClient.invalidateQueries({ queryKey: semanticWorkspaceQueryKey });
    },
  });
}

export function useDeleteSemanticCube() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSemanticCube,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semanticCubesQueryKey });
      queryClient.invalidateQueries({ queryKey: semanticWorkspaceQueryKey });
    },
  });
}

export function useDeleteSemanticView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSemanticView,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: semanticViewsQueryKey });
      queryClient.invalidateQueries({ queryKey: semanticWorkspaceQueryKey });
    },
  });
}

export function useSemanticCubeYaml(name: string, variant: 'draft' | 'published', enabled: boolean) {
  return useQuery({
    queryKey: [...semanticCubeQueryKey(name), 'yaml', variant],
    queryFn: () => fetchSemanticCubeYaml(name, variant),
    enabled: enabled && Boolean(name),
  });
}

export function useApplySemanticCubeYaml(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (yaml: string) => applySemanticCubeYaml(name, yaml),
    onSuccess: (data) => {
      queryClient.setQueryData(semanticCubeQueryKey(name), data);
      queryClient.invalidateQueries({ queryKey: semanticCubesQueryKey });
      queryClient.invalidateQueries({ queryKey: [...semanticCubeQueryKey(name), 'yaml'] });
    },
  });
}

export function useSemanticViewYaml(name: string, variant: 'draft' | 'published', enabled: boolean) {
  return useQuery({
    queryKey: [...semanticViewQueryKey(name), 'yaml', variant],
    queryFn: () => fetchSemanticViewYaml(name, variant),
    enabled: enabled && Boolean(name),
  });
}

export function useApplySemanticViewYaml(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (yaml: string) => applySemanticViewYaml(name, yaml),
    onSuccess: (data) => {
      queryClient.setQueryData(semanticViewQueryKey(name), data);
      queryClient.invalidateQueries({ queryKey: semanticViewsQueryKey });
    },
  });
}

export function usePreviewSemanticQuery() {
  return useMutation({
    mutationFn: previewSemanticQuery,
  });
}
