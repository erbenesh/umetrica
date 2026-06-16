import {
  PrivacySettingsSchema,
  PrivacySettingsViewSchema,
  TrustPolicyViewSchema,
  buildBenchmarkParticipationView,
  type PrivacySettingsView,
  type TrustPolicyView,
  type UpdatePrivacySettingsInput,
} from '@sellerpool/core';

import { apiFetch } from '@/lib/api-client';

export type PrivacySettingsResponse = PrivacySettingsView & {
  trustPolicy?: TrustPolicyView;
};

/** Older API builds may return bare PrivacySettings without pool stats — normalize client-side. */
function normalizePrivacySettings(raw: unknown): PrivacySettingsResponse {
  const record = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const { trustPolicy: trustPolicyRaw, ...rest } = record;

  const parsed = PrivacySettingsViewSchema.safeParse(rest);
  if (parsed.success) {
    const trustPolicy = TrustPolicyViewSchema.safeParse(trustPolicyRaw);
    return {
      ...parsed.data,
      ...(trustPolicy.success ? { trustPolicy: trustPolicy.data } : {}),
    };
  }

  const privacyOnly = PrivacySettingsSchema.safeParse(rest);
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

export type PrivacySettingsUpdateResult = PrivacySettingsResponse & { notice?: string };

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
