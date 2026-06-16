import {
  PrivacySettingsSchema,
  PrivacySettingsViewSchema,
  buildBenchmarkParticipationView,
  type PrivacySettingsView,
  type UpdatePrivacySettingsInput,
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

/** Older API builds may return bare PrivacySettings without pool stats — normalize client-side. */
function normalizePrivacySettings(raw: unknown): PrivacySettingsView {
  const parsed = PrivacySettingsViewSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  const privacyOnly = PrivacySettingsSchema.safeParse(raw);
  if (privacyOnly.success) {
    return buildBenchmarkParticipationView(privacyOnly.data, 0);
  }

  throw new Error('Invalid privacy settings response');
}

export const privacyQueryKey = ['privacy'] as const;

export function fetchPrivacySettings() {
  return apiFetch<unknown>('/api/privacy').then(normalizePrivacySettings);
}

export function updatePrivacySettings(input: UpdatePrivacySettingsInput) {
  return updatePrivacySettingsWithNotice(input);
}

export type PrivacySettingsUpdateResult = PrivacySettingsView & { notice?: string };

export function updatePrivacySettingsWithNotice(input: UpdatePrivacySettingsInput) {
  return apiFetch<unknown>('/api/privacy', {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((raw) => {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error('Invalid privacy settings response');
    }

    const record = raw as Record<string, unknown>;
    const { notice, ...rest } = record;

    return {
      ...normalizePrivacySettings(rest),
      ...(typeof notice === 'string' ? { notice } : {}),
    } satisfies PrivacySettingsUpdateResult;
  });
}
