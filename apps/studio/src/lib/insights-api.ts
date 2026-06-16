import type {
  Insight,
  InsightHistoryResponse,
  InsightSettings,
  UpdateInsightSettingsInput,
} from '@sellerpool/core';

import { apiFetch } from '@/lib/api-client';

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
  return apiFetch<void>(`/api/insights/${id}`, { method: 'DELETE' });
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
