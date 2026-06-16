import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AuditFilter } from '@umetrica/core';

import {
  exportAuditCsv,
  fetchAuditEvents,
  fetchEnterpriseLlmSettings,
  fetchSsoSettings,
  updateEnterpriseLlmSettings,
  updateSsoSettings,
} from '@/lib/enterprise-api';

export const auditQueryKey = ['audit'] as const;
export const ssoQueryKey = ['sso'] as const;
export const enterpriseLlmQueryKey = ['enterprise-llm'] as const;

export function useAuditEvents(filter: AuditFilter = 'all') {
  return useQuery({
    queryKey: [...auditQueryKey, filter],
    queryFn: () => fetchAuditEvents(filter),
    retry: false,
  });
}

export function useSsoSettings() {
  return useQuery({
    queryKey: ssoQueryKey,
    queryFn: fetchSsoSettings,
    retry: false,
  });
}

export function useUpdateSsoSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSsoSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ssoQueryKey });
    },
  });
}

export function useEnterpriseLlmSettings() {
  return useQuery({
    queryKey: enterpriseLlmQueryKey,
    queryFn: fetchEnterpriseLlmSettings,
    retry: false,
  });
}

export function useUpdateEnterpriseLlmSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEnterpriseLlmSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enterpriseLlmQueryKey });
    },
  });
}

export async function downloadAuditCsv() {
  const response = await exportAuditCsv();
  if (!response.ok) {
    throw new Error('Не удалось экспортировать audit log');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audit-log.csv';
  link.click();
  URL.revokeObjectURL(url);
}
