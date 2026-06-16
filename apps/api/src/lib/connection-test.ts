import type { ConnectionTestResult } from '@umetrica/core';
import postgres from 'postgres';

import { testOzonApiCredentials } from './ozon-sync.js';

const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function testWildberriesApiKey(apiKey: string): Promise<ConnectionTestResult> {
  try {
    const response = await fetchWithTimeout('https://statistics-api.wildberries.ru/ping', {
      method: 'GET',
      headers: { Authorization: apiKey },
    });

    if (response.status === 401) {
      return { ok: false, message: 'Ключ недействителен или отозван' };
    }

    if (response.status === 403) {
      return {
        ok: false,
        message:
          'У ключа нет доступа к статистике — при создании токена включите категорию «Статистика»',
      };
    }

    if (!response.ok) {
      return { ok: false, message: `Wildberries вернул ошибку ${response.status}` };
    }

    return { ok: true, message: 'Ключ действителен · доступ к статистике подтверждён' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Таймаут при обращении к Wildberries' };
    }

    const message = error instanceof Error ? error.message : 'Не удалось проверить ключ';
    return { ok: false, message };
  }
}

export async function testMarketplaceApiConnection(
  provider: string,
  credentials: { apiKey: string; clientId?: string }
): Promise<ConnectionTestResult> {
  if (provider === 'wildberries') {
    return testWildberriesApiKey(credentials.apiKey);
  }

  if (provider === 'ozon') {
    if (!credentials.clientId) {
      return { ok: false, message: 'Укажите Client-Id из кабинета Ozon' };
    }
    return testOzonApiCredentials({
      clientId: credentials.clientId,
      apiKey: credentials.apiKey,
    });
  }

  return { ok: false, message: 'Проверка API для этого маркетплейса пока не реализована' };
}

export type DatabaseTestParams = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
};

export async function testPostgresConnection(params: DatabaseTestParams) {
  const sql = postgres({
    host: params.host,
    port: params.port,
    database: params.database,
    username: params.user,
    password: params.password,
    ssl: params.ssl ? 'require' : false,
    max: 1,
    connect_timeout: 8,
  });

  try {
    const rows = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const tableCount = rows[0]?.count ?? 0;
    return {
      ok: true as const,
      message: `Успешно. Найдено ${tableCount} таблиц.`,
      tableCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось подключиться';
    return { ok: false as const, message };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
