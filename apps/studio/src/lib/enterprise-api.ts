import type {
  AuditEventsResponse,
  AuditFilter,
  EnterpriseLlmSettings,
  SsoSettings,
  UpdateEnterpriseLlmSettingsInput,
  UpdateSsoSettingsInput,
} from '@sellerpool/core';

import { API_BASE, apiFetch } from '@/lib/api-client';

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
