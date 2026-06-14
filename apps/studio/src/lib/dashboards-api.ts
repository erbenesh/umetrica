import type { CreateDashboardInput, Dashboard, UpdateDashboardInput } from '@umetrica/core';

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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

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
