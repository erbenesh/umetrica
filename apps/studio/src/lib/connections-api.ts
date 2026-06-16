import type {
  Connection,
  ConnectionTestResult,
  CreateDatabaseConnectionInput,
  CreateMarketplaceApiConnectionInput,
  CsvUploadResponse,
  MarketplaceConnectResponse,
  TestDatabaseConnectionInput,
  TestMarketplaceApiConnectionInput,
} from '@umetrica/core';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const message =
      typeof error.error === 'string'
        ? error.error
        : typeof error.message === 'string'
          ? error.message
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface ConnectionListResponse {
  items: Connection[];
  total: number;
}

export function fetchConnections() {
  return apiFetch<ConnectionListResponse>('/api/connections');
}

export function createMarketplaceApiConnection(input: CreateMarketplaceApiConnectionInput) {
  return apiFetch<MarketplaceConnectResponse>('/api/connections/marketplace-api', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createDatabaseConnection(input: CreateDatabaseConnectionInput) {
  return apiFetch<Connection>('/api/connections/database', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function testDatabaseConnection(input: TestDatabaseConnectionInput) {
  const response = await fetch(`${API_BASE}/api/connections/test-database`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => ({}))) as ConnectionTestResult & { error?: unknown };

  if (typeof body.message === 'string' && typeof body.ok === 'boolean') {
    return { ok: body.ok, message: body.message, tableCount: body.tableCount };
  }

  if (!response.ok) {
    const message =
      typeof body.error === 'string' ? body.error : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

export async function testMarketplaceApiConnection(input: TestMarketplaceApiConnectionInput) {
  const response = await fetch(`${API_BASE}/api/connections/test-marketplace-api`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => ({}))) as ConnectionTestResult & { error?: unknown };

  if (typeof body.message === 'string' && typeof body.ok === 'boolean') {
    return { ok: body.ok, message: body.message, tableCount: body.tableCount };
  }

  if (!response.ok) {
    const message =
      typeof body.error === 'string' ? body.error : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

export function uploadCsvConnection(payload: {
  file: File;
  provider: string;
  reportType: string;
  deleteAfterImport: boolean;
}) {
  const form = new FormData();
  form.append('file', payload.file);
  form.append('provider', payload.provider);
  form.append('reportType', payload.reportType);
  form.append('deleteAfterImport', String(payload.deleteAfterImport));

  return apiFetch<CsvUploadResponse>('/api/connections/csv', {
    method: 'POST',
    body: form,
  });
}

export function reuploadCsvConnection(
  connectionId: string,
  payload: {
    file: File;
    provider: string;
    reportType: string;
    deleteAfterImport: boolean;
  }
) {
  const form = new FormData();
  form.append('file', payload.file);
  form.append('provider', payload.provider);
  form.append('reportType', payload.reportType);
  form.append('deleteAfterImport', String(payload.deleteAfterImport));

  return apiFetch<CsvUploadResponse>(`/api/connections/${connectionId}/csv`, {
    method: 'POST',
    body: form,
  });
}

export function deleteConnection(id: string) {
  return apiFetch<void>(`/api/connections/${id}`, { method: 'DELETE' });
}

export function syncConnection(id: string) {
  return apiFetch<MarketplaceConnectResponse>(`/api/connections/${id}/sync`, {
    method: 'POST',
  });
}
