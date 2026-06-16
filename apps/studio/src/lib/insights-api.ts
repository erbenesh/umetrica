import type {
  Insight,
  InsightHistoryResponse,
  InsightSettings,
  UpdateInsightSettingsInput,
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

export interface InsightListResponse {
  items: Insight[];
  total: number;
}

export interface GenerateInsightResponse {
  generated: boolean;
  message?: string;
  items?: Insight[];
  count?: number;
}

export function fetchInsights() {
  return apiFetch<InsightListResponse>('/api/insights');
}

export function generateInsight() {
  return apiFetch<GenerateInsightResponse>('/api/insights/generate', {
    method: 'POST',
  });
}

export function deleteInsight(id: string) {
  return fetch(`${API_BASE}/api/insights/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to delete insight');
    }
  });
}

export const insightQueryKey = (id: string) => ['insights', id] as const;

export function fetchInsight(id: string) {
  return apiFetch<Insight>(`/api/insights/${id}`);
}

export function fetchInsightHistory() {
  return apiFetch<InsightHistoryResponse>('/api/insights/history');
}

export function fetchInsightSettings() {
  return apiFetch<InsightSettings>('/api/insights/settings');
}

export function updateInsightSettings(input: UpdateInsightSettingsInput) {
  return apiFetch<InsightSettings>('/api/insights/settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
