import type { CreateDashboardInput, Dashboard, UpdateDashboardInput } from '@sellerpool/core';

import { apiFetch } from '@/lib/api-client';

export interface DashboardListResponse {
  items: Dashboard[];
  total: number;
}

export function fetchDashboards() {
  return apiFetch<DashboardListResponse>('/api/dashboards');
}

export function fetchDashboard(id: string) {
  return apiFetch<Dashboard>(`/api/dashboards/${id}`);
}

export function createDashboard(input: CreateDashboardInput) {
  return apiFetch<Dashboard>('/api/dashboards', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateDashboard(id: string, input: UpdateDashboardInput) {
  return apiFetch<Dashboard>(`/api/dashboards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteDashboard(id: string) {
  return apiFetch<void>(`/api/dashboards/${id}`, {
    method: 'DELETE',
  });
}
