import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDashboard,
  deleteDashboard,
  fetchDashboard,
  fetchDashboards,
  updateDashboard,
} from '@/lib/dashboards-api';
import type { CreateDashboardInput, UpdateDashboardInput } from '@umetrica/core';

export const dashboardsQueryKey = ['dashboards'] as const;
export const dashboardQueryKey = (id: string) => ['dashboards', id] as const;

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
    },
  });
}

export function useUpdateDashboard(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDashboardInput) => updateDashboard(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(dashboardQueryKey(id), data);
      queryClient.invalidateQueries({ queryKey: dashboardsQueryKey });
    },
  });
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardsQueryKey });
    },
  });
}
