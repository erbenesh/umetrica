import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchInsights, generateInsight, deleteInsight } from '@/lib/insights-api';

export const insightsQueryKey = ['insights'] as const;

export function useInsights() {
  return useQuery({
    queryKey: insightsQueryKey,
    queryFn: fetchInsights,
  });
}

export function useGenerateInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateInsight,
    onSuccess: (data) => {
      if (data.generated) {
        queryClient.invalidateQueries({ queryKey: insightsQueryKey });
      }
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
