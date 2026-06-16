import { randomUUID } from 'node:crypto';

import {
  ConnectionConfigSchema,
  CreateDatabaseConnectionSchema,
  CreateMarketplaceApiConnectionSchema,
  TestDatabaseConnectionSchema,
  TestMarketplaceApiConnectionSchema,
  type Connection,
  type ConnectionConfig,
} from '@umetrica/core';
import { and, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { connections } from '../db/connections.js';
import { db } from '../db/index.js';
import { decryptCredentials, encryptCredentials } from '../lib/connection-crypto.js';
import { importCsvForTenant, parseCsvMultipart } from '../lib/csv-upload.js';
import { testMarketplaceApiConnection, testPostgresConnection } from '../lib/connection-test.js';
import { syncMarketplaceConnection } from '../lib/marketplace-sync.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

const MARKETPLACE_LABELS: Record<string, string> = {
  wildberries: 'Wildberries',
  ozon: 'Ozon',
  yandex_market: 'Яндекс Маркет',
};

const DATABASE_LABELS: Record<string, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  bigquery: 'BigQuery',
  clickhouse: 'ClickHouse',
};

function buildCsvConfig(
  provider: string,
  upload: {
    reportType: string;
    deleteAfterImport: boolean;
    fileName: string;
    fileBuffer: Buffer;
  },
  importResult: { imported: number; skipped: number }
): ConnectionConfig {
  const displayName = marketplaceDisplayName(provider);
  return {
    subtitle: `${displayName} · продажи`,
    reportType: upload.reportType,
    deleteAfterImport: upload.deleteAfterImport,
    fileName: upload.fileName,
    fileSize: upload.fileBuffer.length,
    importedRowCount: importResult.imported,
    skippedRowCount: importResult.skipped,
  };
}

function parseConfig(raw: unknown): ConnectionConfig {
  const parsed = ConnectionConfigSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

function toConnection(row: typeof connections.$inferSelect): Connection {
  const config = parseConfig(row.config);
  return {
    id: row.id,
    organizationId: row.organizationId,
    kind: row.kind as Connection['kind'],
    provider: row.provider,
    name: row.name,
    method: row.method as Connection['method'],
    status: row.status as Connection['status'],
    config,
    lastSyncAt: row.lastSyncAt?.toISOString(),
    lastError: row.lastError ?? undefined,
    hasCredentials: Boolean(row.credentialsEnc),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function marketplaceDisplayName(provider: string) {
  return MARKETPLACE_LABELS[provider] ?? provider;
}

function databaseDisplayName(provider: string) {
  return DATABASE_LABELS[provider] ?? provider;
}

async function resolveDatabaseTestParams(
  organizationId: string,
  input: { connectionId: string } | ReturnType<typeof CreateDatabaseConnectionSchema.parse>
) {
  if ('connectionId' in input) {
    const [row] = await db
      .select()
      .from(connections)
      .where(and(eq(connections.id, input.connectionId), eq(connections.organizationId, organizationId)))
      .limit(1);

    if (!row?.credentialsEnc) {
      return { error: 'Подключение не найдено или без учётных данных' as const };
    }

    const creds = decryptCredentials<{ user: string; password: string }>(row.credentialsEnc);
    const config = parseConfig(row.config);

    if (!config.host || !config.port || !config.database) {
      return { error: 'Неполная конфигурация подключения' as const };
    }

    return {
      params: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: creds.user,
        password: creds.password,
        ssl: config.ssl ?? true,
      },
    };
  }

  return {
    params: {
      host: input.host,
      port: input.port,
      database: input.database,
      user: input.user,
      password: input.password,
      ssl: input.ssl,
    },
  };
}

async function resolveMarketplaceTestApiKey(
  organizationId: string,
  input: { connectionId: string } | { provider: string; apiKey: string; clientId?: string }
) {
  if ('connectionId' in input) {
    const [row] = await db
      .select()
      .from(connections)
      .where(and(eq(connections.id, input.connectionId), eq(connections.organizationId, organizationId)))
      .limit(1);

    if (!row?.credentialsEnc) {
      return { error: 'Подключение не найдено или без учётных данных' as const };
    }

    const creds = decryptCredentials<{ apiKey: string; clientId?: string }>(row.credentialsEnc);
    return { provider: row.provider, apiKey: creds.apiKey, clientId: creds.clientId };
  }

  return { provider: input.provider, apiKey: input.apiKey, clientId: input.clientId };
}

async function runMarketplaceSync(
  organizationId: string,
  connection: typeof connections.$inferSelect
) {
  if (!connection.credentialsEnc || connection.method !== 'api') {
    return { error: 'Синхронизация доступна только для API-подключений' as const };
  }

  const creds = decryptCredentials<{ apiKey: string; clientId?: string }>(connection.credentialsEnc);

  try {
    const syncResult = await syncMarketplaceConnection(organizationId, connection.provider, creds);
    const now = new Date();
    const config: ConnectionConfig = {
      ...parseConfig(connection.config),
      syncedRowCount: syncResult.imported,
      skippedRowCount: syncResult.skipped,
    };

    const [row] = await db
      .update(connections)
      .set({
        status: syncResult.imported > 0 ? 'active' : 'error',
        lastError: syncResult.imported > 0 ? null : syncResult.message,
        lastSyncAt: now,
        config,
        updatedAt: now,
      })
      .where(eq(connections.id, connection.id))
      .returning();

    return { connection: row!, sync: syncResult };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка синхронизации';
    const now = new Date();

    await db
      .update(connections)
      .set({
        status: 'error',
        lastError: message,
        updatedAt: now,
      })
      .where(eq(connections.id, connection.id));

    return { error: message };
  }
}

export async function registerConnectionRoutes(app: FastifyInstance) {
  app.get('/api/connections', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const rows = await db
      .select()
      .from(connections)
      .where(eq(connections.organizationId, auth.organizationId))
      .orderBy(desc(connections.updatedAt));

    return {
      items: rows.map(toConnection),
      total: rows.length,
    };
  });

  app.post('/api/connections/marketplace-api', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = CreateMarketplaceApiConnectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { provider, apiKey, clientId, name, category, benchmarkOptIn } = parsed.data;

    const testResult = await testMarketplaceApiConnection(provider, { apiKey, clientId });
    if (!testResult.ok) {
      return reply.status(400).send({ error: testResult.message });
    }

    const displayName = marketplaceDisplayName(provider);
    const now = new Date();
    const id = randomUUID();

    const config: ConnectionConfig = {
      subtitle: `${displayName} · продажи`,
      category,
      benchmarkOptIn: benchmarkOptIn ?? false,
    };

    let credentialsEnc: string;
    try {
      credentialsEnc = encryptCredentials({ apiKey, ...(clientId ? { clientId } : {}) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Encryption failed';
      return reply.status(500).send({ error: message });
    }

    const [row] = await db
      .insert(connections)
      .values({
        id,
        organizationId: auth.organizationId,
        kind: 'marketplace',
        provider,
        name: name ?? displayName,
        method: 'api',
        status: 'pending',
        config,
        credentialsEnc,
        lastSyncAt: null,
        createdBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const sync = await runMarketplaceSync(auth.organizationId, row!);

    if (benchmarkOptIn) {
      const { updatePrivacySettings, getInsightSettings, updateInsightSettings } = await import(
        '../lib/org-metadata.js'
      );
      await updatePrivacySettings(auth.organizationId, { benchmarkOptIn: true });
      const insightSettings = await getInsightSettings(auth.organizationId);
      await updateInsightSettings(auth.organizationId, {
        sources: { ...insightSettings.sources, benchmark: true },
      });
    }

    const [updated] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, id))
      .limit(1);

    return reply.status(201).send({
      connection: toConnection(updated!),
      sync: 'error' in sync ? { imported: 0, skipped: 0, message: sync.error } : sync.sync,
    });
  });

  app.post('/api/connections/test-marketplace-api', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = TestMarketplaceApiConnectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const resolved = await resolveMarketplaceTestApiKey(auth.organizationId, parsed.data);
    if ('error' in resolved) {
      return reply.status(404).send({ error: resolved.error });
    }

    const result = await testMarketplaceApiConnection(resolved.provider, {
      apiKey: resolved.apiKey,
      clientId: resolved.clientId,
    });
    return reply.status(result.ok ? 200 : 400).send(result);
  });

  app.post('/api/connections/database', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = CreateDatabaseConnectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const input = parsed.data;

    if (input.provider !== 'postgresql') {
      return reply.status(400).send({ error: 'Пока поддерживается только PostgreSQL' });
    }

    const test = await testPostgresConnection({
      host: input.host,
      port: input.port,
      database: input.database,
      user: input.user,
      password: input.password,
      ssl: input.ssl,
    });

    if (!test.ok) {
      return reply.status(400).send({ error: test.message });
    }

    const now = new Date();
    const id = randomUUID();

    const config: ConnectionConfig = {
      subtitle: 'Основной · используется в Orders',
      host: input.host,
      port: input.port,
      database: input.database,
      ssl: input.ssl,
    };

    let credentialsEnc: string;
    try {
      credentialsEnc = encryptCredentials({ user: input.user, password: input.password });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Encryption failed';
      return reply.status(500).send({ error: message });
    }

    const [row] = await db
      .insert(connections)
      .values({
        id,
        organizationId: auth.organizationId,
        kind: 'database',
        provider: input.provider,
        name: input.name,
        method: 'jdbc',
        status: 'active',
        config,
        credentialsEnc,
        lastSyncAt: now,
        createdBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return reply.status(201).send(toConnection(row!));
  });

  app.post('/api/connections/test-database', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = TestDatabaseConnectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const resolved = await resolveDatabaseTestParams(auth.organizationId, parsed.data);
    if ('error' in resolved) {
      return reply.status(404).send({ error: resolved.error });
    }

    if (parsed.data && 'provider' in parsed.data && parsed.data.provider !== 'postgresql') {
      return reply.status(400).send({ error: 'Пока поддерживается только PostgreSQL' });
    }

    const result = await testPostgresConnection(resolved.params);
    return reply.status(result.ok ? 200 : 400).send(result);
  });

  app.post('/api/connections/csv', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = await parseCsvMultipart(request.parts());
    if ('error' in parsed) {
      return reply.status(400).send({ error: parsed.error });
    }

    const importResult = await importCsvForTenant(auth.organizationId, parsed);
    if ('error' in importResult) {
      return reply.status(400).send({ error: importResult.error });
    }

    const displayName = marketplaceDisplayName(parsed.provider);
    const now = new Date();
    const id = randomUUID();
    const config = buildCsvConfig(parsed.provider, parsed, importResult);

    const [row] = await db
      .insert(connections)
      .values({
        id,
        organizationId: auth.organizationId,
        kind: 'csv',
        provider: parsed.provider,
        name: displayName,
        method: 'csv',
        status: 'active',
        config,
        credentialsEnc: null,
        lastSyncAt: now,
        createdBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return reply.status(201).send({
      connection: toConnection(row!),
      import: importResult,
    });
  });

  app.post('/api/connections/:id/csv', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(connections)
      .where(and(eq(connections.id, id), eq(connections.organizationId, auth.organizationId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: 'Подключение не найдено' });
    }

    if (existing.kind !== 'csv' && existing.method !== 'csv') {
      return reply.status(400).send({ error: 'Обновление файла доступно только для CSV-подключений' });
    }

    const parsed = await parseCsvMultipart(request.parts());
    if ('error' in parsed) {
      return reply.status(400).send({ error: parsed.error });
    }

    const importResult = await importCsvForTenant(auth.organizationId, parsed);
    if ('error' in importResult) {
      const now = new Date();
      await db
        .update(connections)
        .set({
          status: 'error',
          lastError: importResult.error,
          updatedAt: now,
        })
        .where(eq(connections.id, id));

      return reply.status(400).send({ error: importResult.error });
    }

    const now = new Date();
    const provider = parsed.provider || existing.provider;
    const config = buildCsvConfig(provider, parsed, importResult);

    const [row] = await db
      .update(connections)
      .set({
        provider,
        name: marketplaceDisplayName(provider),
        status: 'active',
        config,
        lastSyncAt: now,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(connections.id, id))
      .returning();

    return reply.send({
      connection: toConnection(row!),
      import: importResult,
    });
  });

  app.post('/api/connections/:id/sync', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(connections)
      .where(and(eq(connections.id, id), eq(connections.organizationId, auth.organizationId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: 'Подключение не найдено' });
    }

    const sync = await runMarketplaceSync(auth.organizationId, existing);
    if ('error' in sync) {
      return reply.status(400).send({ error: sync.error });
    }

    return reply.send({
      connection: toConnection(sync.connection),
      sync: sync.sync,
    });
  });

  app.delete('/api/connections/:id', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as { id: string };

    const [deleted] = await db
      .delete(connections)
      .where(and(eq(connections.id, id), eq(connections.organizationId, auth.organizationId)))
      .returning({ id: connections.id });

    if (!deleted) {
      return reply.status(404).send({ error: 'Connection not found' });
    }

    return reply.status(204).send();
  });
}
