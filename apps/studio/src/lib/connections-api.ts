import type {
  Connection,
  ConnectionTestResult,
  CreateDatabaseConnectionInput,
  CreateMarketplaceApiConnectionInput,
  CsvUploadResponse,
  MarketplaceConnectResponse,
  TestDatabaseConnectionInput,
  TestMarketplaceApiConnectionInput,
} from '@sellerpool/core';

import { API_BASE, ApiError, apiFetch } from '@/lib/api-client';

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
  return postConnectionTest('/api/connections/test-database', input);
}

export async function testMarketplaceApiConnection(input: TestMarketplaceApiConnectionInput) {
  return postConnectionTest('/api/connections/test-marketplace-api', input);
}

async function postConnectionTest(
  path: string,
  input: TestDatabaseConnectionInput | TestMarketplaceApiConnectionInput,
): Promise<ConnectionTestResult> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => ({}))) as ConnectionTestResult & {
    error?: unknown;
  };

  if (typeof body.ok === 'boolean' && typeof body.message === 'string') {
    return { ok: body.ok, message: body.message, tableCount: body.tableCount };
  }

  if (!response.ok) {
    throw new ApiError(response.status, body);
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
