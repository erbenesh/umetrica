import {
  messageFromApiErrorPayload,
  type ApiErrorBody,
  type ApiErrorCode,
} from '@sellerpool/core';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: ApiErrorCode;
  readonly details?: unknown;
  readonly body?: ApiErrorBody;

  constructor(status: number, body: unknown, fallback?: string) {
    const message = messageFromApiErrorPayload(body, fallback ?? `Ошибка запроса (${status})`);
    super(message);
    this.name = 'ApiError';
    this.status = status;

    if (typeof body === 'object' && body !== null) {
      const record = body as ApiErrorBody;
      this.code = record.code;
      this.details = record.details;
      if (typeof record.error === 'string') {
        this.body = record;
      }
    }
  }
}

export function getErrorMessage(error: unknown, fallback = 'Ошибка запроса'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const hasJsonBody = init?.body !== undefined && !(init.body instanceof FormData);

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
