import type {
  AuditEventsResponse,
  AuditFilter,
  EnterpriseLlmSettings,
  SsoSettings,
  UpdateEnterpriseLlmSettingsInput,
  UpdateSsoSettingsInput,
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

export function fetchAuditEvents(filter: AuditFilter = 'all') {
  return apiFetch<AuditEventsResponse>(`/api/audit?filter=${filter}`);
}

export function exportAuditCsv() {
  return fetch(`${API_BASE}/api/audit/export`, { credentials: 'include' });
}

export function fetchSsoSettings() {
  return apiFetch<SsoSettings>('/api/sso');
}

export function updateSsoSettings(input: UpdateSsoSettingsInput) {
  return apiFetch<SsoSettings>('/api/sso', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function fetchEnterpriseLlmSettings() {
  return apiFetch<EnterpriseLlmSettings>('/api/enterprise/llm');
}

export function updateEnterpriseLlmSettings(input: UpdateEnterpriseLlmSettingsInput) {
  return apiFetch<EnterpriseLlmSettings>('/api/enterprise/llm', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
