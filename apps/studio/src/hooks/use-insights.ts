import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteInsight,
  fetchInsightHistory,
  fetchInsightSettings,
  fetchInsights,
  generateInsight,
  updateInsightSettings,
} from '@/lib/insights-api';

export const insightsQueryKey = ['insights'] as const;
export const insightHistoryQueryKey = ['insights', 'history'] as const;
export const insightSettingsQueryKey = ['insights', 'settings'] as const;

export function useInsights() {
  return useQuery({
    queryKey: insightsQueryKey,
    queryFn: fetchInsights,
  });
}

export function useInsightHistory() {
  return useQuery({
    queryKey: insightHistoryQueryKey,
    queryFn: fetchInsightHistory,
  });
}

export function useInsightSettings() {
  return useQuery({
    queryKey: insightSettingsQueryKey,
    queryFn: fetchInsightSettings,
  });
}

export function useUpdateInsightSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInsightSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightSettingsQueryKey });
    },
  });
}

export function useGenerateInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightsQueryKey });
      queryClient.invalidateQueries({ queryKey: insightHistoryQueryKey });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useDeleteInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInsight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightsQueryKey });
    },
  });
}
