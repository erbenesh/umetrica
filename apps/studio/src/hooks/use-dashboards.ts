import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDashboard,
  deleteDashboard,
  fetchDashboard,
  fetchDashboards,
  updateDashboard,
} from '@/lib/dashboards-api';
import { appToast } from '@/lib/app-toast';
import type { CreateDashboardInput, UpdateDashboardInput } from '@sellerpool/core';

export const dashboardsQueryKey = ['dashboards'] as const;
export const dashboardQueryKey = (id: string) => ['dashboards', id] as const;

export type UpdateDashboardMutationInput = {
  input: UpdateDashboardInput;
  /** Без тоста — для автосохранения раскладки виджетов */
  silent?: boolean;
  successMessage?: string;
};

export function useDashboards() {
  return useQuery({
    queryKey: dashboardsQueryKey,
    queryFn: fetchDashboards,
  });
}

export function useDashboard(id: string | undefined) {
  return useQuery({
    queryKey: dashboardQueryKey(id ?? ''),
    queryFn: () => fetchDashboard(id!),
    enabled: Boolean(id),
  });
}

export function useCreateDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDashboardInput) => createDashboard(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardsQueryKey });
      appToast.success('Дашборд создан');
    },
  });
}

export function useUpdateDashboard(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input }: UpdateDashboardMutationInput) => updateDashboard(id, input),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(dashboardQueryKey(id), data);
      queryClient.invalidateQueries({ queryKey: dashboardsQueryKey });
      if (!variables.silent) {
        appToast.success(variables.successMessage ?? 'Дашборд сохранён');
      }
    },
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardsQueryKey });
      appToast.success('Дашборд удалён');
    },
  });
}
