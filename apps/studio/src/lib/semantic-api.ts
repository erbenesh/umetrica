import type {
  CreateSemanticCubeInput,
  SemanticCubeDetail,
  SemanticCubeListItem,
  SemanticPublishInput,
  SemanticPublishPreview,
  SemanticTableInfo,
  UpdateSemanticDraftInput,
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

  return response.json() as Promise<T>;
}

export const semanticCubesQueryKey = ['semantic', 'cubes'] as const;

export function semanticCubeQueryKey(name: string) {
  return ['semantic', 'cubes', name] as const;
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

export function createSemanticCube(input: CreateSemanticCubeInput) {
  return apiFetch<SemanticCubeDetail>('/api/semantic/cubes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
