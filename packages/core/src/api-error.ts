export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYMENT_REQUIRED',
  'INTERNAL',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  error: string;
  code?: ApiErrorCode;
  details?: unknown;
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorBody).error === 'string'
  );
}

function firstZodFlattenMessage(flat: unknown): string | undefined {
  if (typeof flat !== 'object' || flat === null) return undefined;
  const record = flat as {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
  };
  const form = record.formErrors?.find(Boolean);
  if (form) return form;
  for (const messages of Object.values(record.fieldErrors ?? {})) {
    const field = messages?.find(Boolean);
    if (field) return field;
  }
  return undefined;
}

/** User-facing message from API JSON (also handles legacy Zod flatten in `error`). */
export function messageFromApiErrorPayload(
  payload: unknown,
  fallback = 'Ошибка запроса',
): string {
  if (isApiErrorBody(payload)) {
    return payload.error;
  }

  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;

    if (typeof record.message === 'string' && record.message) {
      return record.message;
    }

    if (typeof record.error === 'string' && record.error) {
      return record.error;
    }

    const nested = firstZodFlattenMessage(record.error);
    if (nested) return nested;
  }

  return fallback;
}
