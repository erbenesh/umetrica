import type {
  CreateSemanticCubeInput,
  CreateSemanticViewInput,
  SemanticColumnInfo,
  SemanticCubeDefinition,
  SemanticCubeDetail,
  SemanticCubeListItem,
  SemanticForeignKeyInfo,
  SemanticPublishDiffRow,
  SemanticPublishInput,
  SemanticPublishPreview,
  SemanticTableInfo,
  SemanticViewDetail,
  SemanticViewListItem,
  SemanticWorkspaceLayout,
  SemanticYamlResponse,
  UpdateSemanticDraftInput,
  UpdateSemanticViewDraftInput,
} from '@umetrica/core';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const message =
      typeof error.error === 'string' ? error.error : `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const semanticCubesQueryKey = ['semantic', 'cubes'] as const;
export const semanticViewsQueryKey = ['semantic', 'views'] as const;
export const semanticWorkspaceQueryKey = ['semantic', 'workspace'] as const;

export function semanticCubeQueryKey(name: string) {
  return ['semantic', 'cubes', name] as const;
}

export function semanticViewQueryKey(name: string) {
  return ['semantic', 'views', name] as const;
}

export function fetchSemanticCubes() {
  return apiFetch<{ items: SemanticCubeListItem[]; total: number }>('/api/semantic/cubes');
}

export function fetchSemanticCube(name: string) {
  return apiFetch<SemanticCubeDetail>(`/api/semantic/cubes/${encodeURIComponent(name)}`);
}

export function updateSemanticDraft(name: string, input: UpdateSemanticDraftInput) {
  return apiFetch<SemanticCubeDetail>(`/api/semantic/cubes/${encodeURIComponent(name)}/draft`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function discardSemanticDraft(name: string) {
  return apiFetch<SemanticCubeDetail>(
    `/api/semantic/cubes/${encodeURIComponent(name)}/discard-draft`,
    { method: 'POST' }
  );
}

export function fetchSemanticPublishPreview(name: string) {
  return apiFetch<SemanticPublishPreview>(
    `/api/semantic/cubes/${encodeURIComponent(name)}/publish-preview`
  );
}

export function publishSemanticCube(name: string, input: SemanticPublishInput = {}) {
  return apiFetch<SemanticCubeDetail>(`/api/semantic/cubes/${encodeURIComponent(name)}/publish`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchSemanticSchemaTables(connectionId?: string) {
  const query = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : '';
  return apiFetch<{ connectionLabel: string; items: SemanticTableInfo[] }>(
    `/api/semantic/introspection/tables${query}`
  );
}

export function fetchSemanticSchemaColumns(table: string, connectionId?: string) {
  const params = new URLSearchParams({ table });
  if (connectionId) params.set('connectionId', connectionId);
  return apiFetch<{ table: string; items: SemanticColumnInfo[] }>(
    `/api/semantic/introspection/columns?${params.toString()}`
  );
}

export function fetchSemanticForeignKeys(connectionId?: string) {
  const query = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : '';
  return apiFetch<{ items: SemanticForeignKeyInfo[] }>(
    `/api/semantic/introspection/foreign-keys${query}`
  );
}

export function createSemanticCube(input: CreateSemanticCubeInput) {
  return apiFetch<SemanticCubeDetail>('/api/semantic/cubes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteSemanticCube(name: string) {
  return apiFetch<void>(`/api/semantic/cubes/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

export function fetchSemanticWorkspace() {
  return apiFetch<{
    layout: SemanticWorkspaceLayout;
    cubes: SemanticCubeListItem[];
    views: SemanticViewListItem[];
    updatedAt: string;
  }>('/api/semantic/workspace');
}

export function updateSemanticWorkspace(layout: SemanticWorkspaceLayout) {
  return apiFetch<{ layout: SemanticWorkspaceLayout; updatedAt: string }>('/api/semantic/workspace', {
    method: 'PUT',
    body: JSON.stringify(layout),
  });
}

export function fetchSemanticViews() {
  return apiFetch<{ items: SemanticViewListItem[]; total: number }>('/api/semantic/views');
}

export function fetchSemanticView(name: string) {
  return apiFetch<SemanticViewDetail>(`/api/semantic/views/${encodeURIComponent(name)}`);
}

export function createSemanticView(input: CreateSemanticViewInput) {
  return apiFetch<SemanticViewDetail>('/api/semantic/views', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSemanticViewDraft(name: string, input: UpdateSemanticViewDraftInput) {
  return apiFetch<SemanticViewDetail>(`/api/semantic/views/${encodeURIComponent(name)}/draft`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function discardSemanticViewDraft(name: string) {
  return apiFetch<SemanticViewDetail>(
    `/api/semantic/views/${encodeURIComponent(name)}/discard-draft`,
    { method: 'POST' }
  );
}

export function fetchSemanticViewPublishPreview(name: string) {
  return apiFetch<{ viewName: string; diff: SemanticPublishDiffRow[] }>(
    `/api/semantic/views/${encodeURIComponent(name)}/publish-preview`
  );
}

export function publishSemanticView(name: string) {
  return apiFetch<SemanticViewDetail>(`/api/semantic/views/${encodeURIComponent(name)}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function deleteSemanticView(name: string) {
  return apiFetch<void>(`/api/semantic/views/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

export function fetchSemanticCubeYaml(name: string, variant: 'draft' | 'published' = 'draft') {
  return apiFetch<SemanticYamlResponse>(
    `/api/semantic/cubes/${encodeURIComponent(name)}/yaml?variant=${variant}`
  );
}

export function applySemanticCubeYaml(name: string, yaml: string) {
  return apiFetch<SemanticCubeDetail>(`/api/semantic/cubes/${encodeURIComponent(name)}/yaml`, {
    method: 'PUT',
    body: JSON.stringify({ yaml }),
  });
}

export function fetchSemanticViewYaml(name: string, variant: 'draft' | 'published' = 'draft') {
  return apiFetch<SemanticYamlResponse>(
    `/api/semantic/views/${encodeURIComponent(name)}/yaml?variant=${variant}`
  );
}

export function applySemanticViewYaml(name: string, yaml: string) {
  return apiFetch<SemanticViewDetail>(`/api/semantic/views/${encodeURIComponent(name)}/yaml`, {
    method: 'PUT',
    body: JSON.stringify({ yaml }),
  });
}

export function previewSemanticQuery(query: Record<string, unknown>) {
  return apiFetch<{ data: Array<Record<string, unknown>>; sampleValue: string }>(
    '/api/semantic/preview-query',
    {
      method: 'POST',
      body: JSON.stringify({ query }),
    }
  );
}

export function fetchCubeJoinContext() {
  return apiFetch<{ cubes: SemanticCubeDefinition[] }>('/api/semantic/join-context');
}
