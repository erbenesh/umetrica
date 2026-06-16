import { ConnectionConfigSchema } from '@umetrica/core';
import { and, desc, eq } from 'drizzle-orm';
import postgres from 'postgres';

import { connections } from '../db/connections.js';
import { db } from '../db/index.js';
import { decryptCredentials } from './connection-crypto.js';
import type { DatabaseTestParams } from './connection-test.js';

export type SemanticDbError = { error: string };

export type SemanticTableListResult =
  | SemanticDbError
  | {
      connectionLabel: string;
      items: Array<{
        schema: string;
        name: string;
        qualifiedName: string;
        columnCount: number;
      }>;
    };

export type SemanticColumnListResult =
  | SemanticDbError
  | {
      table: string;
      items: Array<{ name: string; dataType: string; isNullable: boolean }>;
    };

type ResolvePostgresParamsResult =
  | SemanticDbError
  | {
      params: DatabaseTestParams;
      label: string;
      connectionId: string | null;
    };

function paramsFromDatabaseUrl(connectionString: string): DatabaseTestParams {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database: url.pathname.replace(/^\//, ''),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: url.searchParams.get('sslmode') === 'require',
  };
}

function createSql(params: DatabaseTestParams) {
  return postgres({
    host: params.host,
    port: params.port,
    database: params.database,
    username: params.user,
    password: params.password,
    ssl: params.ssl ? 'require' : false,
    max: 1,
    connect_timeout: 8,
  });
}

export async function resolveOrgPostgresParams(
  organizationId: string,
  connectionId?: string
): Promise<ResolvePostgresParamsResult> {
  if (connectionId) {
    const [row] = await db
      .select()
      .from(connections)
      .where(and(eq(connections.id, connectionId), eq(connections.organizationId, organizationId)))
      .limit(1);

    if (!row?.credentialsEnc || row.kind !== 'database') {
      return { error: 'Подключение не найдено' as const };
    }

    if (row.provider !== 'postgresql' && row.provider !== 'postgres') {
      return { error: 'Поддерживается только PostgreSQL' as const };
    }

    const configParsed = ConnectionConfigSchema.safeParse(row.config);
    const creds = decryptCredentials<{ user: string; password: string }>(row.credentialsEnc);

    if (!configParsed.success || !configParsed.data.host || !configParsed.data.port || !configParsed.data.database) {
      return { error: 'Неполная конфигурация подключения' as const };
    }

    return {
      params: {
        host: configParsed.data.host,
        port: configParsed.data.port,
        database: configParsed.data.database,
        user: creds.user,
        password: creds.password,
        ssl: configParsed.data.ssl ?? true,
      },
      label: row.name,
      connectionId: row.id,
    };
  }

  const [row] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.organizationId, organizationId), eq(connections.kind, 'database')))
    .orderBy(desc(connections.updatedAt))
    .limit(1);

  if (row?.credentialsEnc && (row.provider === 'postgresql' || row.provider === 'postgres')) {
    const configParsed = ConnectionConfigSchema.safeParse(row.config);
    const creds = decryptCredentials<{ user: string; password: string }>(row.credentialsEnc);

    if (configParsed.success && configParsed.data.host && configParsed.data.port && configParsed.data.database) {
      return {
        params: {
          host: configParsed.data.host,
          port: configParsed.data.port,
          database: configParsed.data.database,
          user: creds.user,
          password: creds.password,
          ssl: configParsed.data.ssl ?? true,
        },
        label: row.name,
        connectionId: row.id,
      };
    }
  }

  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://umetrica:umetrica@localhost:5432/umetrica';

  return {
    params: paramsFromDatabaseUrl(connectionString),
    label: 'Демо · PostgreSQL',
    connectionId: null as string | null,
  };
}

export async function listPostgresTables(
  organizationId: string,
  connectionId?: string
): Promise<SemanticTableListResult> {
  const resolved = await resolveOrgPostgresParams(organizationId, connectionId);
  if ('error' in resolved) {
    return { error: resolved.error };
  }

  const sql = createSql(resolved.params);

  try {
    const rows = await sql<
      { schema: string; name: string; column_count: number }[]
    >`
      SELECT
        t.table_schema AS schema,
        t.table_name AS name,
        count(c.column_name)::int AS column_count
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c
        ON c.table_schema = t.table_schema
       AND c.table_name = t.table_name
      WHERE t.table_type = 'BASE TABLE'
        AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
      GROUP BY t.table_schema, t.table_name
      ORDER BY t.table_schema, t.table_name
    `;

    return {
      connectionLabel: resolved.label,
      items: rows.map((row) => ({
        schema: row.schema,
        name: row.name,
        qualifiedName: `${row.schema}.${row.name}`,
        columnCount: row.column_count,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось прочитать схему';
    return { error: message };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export async function listPostgresTableColumns(
  organizationId: string,
  table: string,
  connectionId?: string
): Promise<SemanticColumnListResult> {
  const resolved = await resolveOrgPostgresParams(organizationId, connectionId);
  if ('error' in resolved) {
    return { error: resolved.error };
  }

  const dotIndex = table.indexOf('.');
  const schema = dotIndex >= 0 ? table.slice(0, dotIndex) : 'public';
  const tableName = dotIndex >= 0 ? table.slice(dotIndex + 1) : table;
  const sql = createSql(resolved.params);

  try {
    const rows = await sql<{ name: string; data_type: string; is_nullable: string }[]>`
      SELECT column_name AS name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = ${schema}
        AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;

    return {
      table: `${schema}.${tableName}`,
      items: rows.map((row) => ({
        name: row.name,
        dataType: row.data_type,
        isNullable: row.is_nullable === 'YES',
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось прочитать колонки';
    return { error: message };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

export type SemanticForeignKeyListResult =
  | SemanticDbError
  | {
      items: Array<{
        fromTable: string;
        fromColumn: string;
        toTable: string;
        toColumn: string;
        suggestedSql: string;
      }>;
    };

export async function listPostgresForeignKeys(
  organizationId: string,
  connectionId?: string
): Promise<SemanticForeignKeyListResult> {
  const resolved = await resolveOrgPostgresParams(organizationId, connectionId);
  if ('error' in resolved) {
    return { error: resolved.error };
  }

  const sql = createSql(resolved.params);

  try {
    const rows = await sql<
      {
        from_schema: string;
        from_table: string;
        from_column: string;
        to_schema: string;
        to_table: string;
        to_column: string;
      }[]
    >`
      SELECT
        tc.table_schema AS from_schema,
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_schema AS to_schema,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY from_schema, from_table, from_column
    `;

    return {
      items: rows.map((row) => {
        const fromTable = `${row.from_schema}.${row.from_table}`;
        const toTable = `${row.to_schema}.${row.to_table}`;
        const fromCube = row.from_table.charAt(0).toUpperCase() + row.from_table.slice(1);
        const toCube = row.to_table.charAt(0).toUpperCase() + row.to_table.slice(1);

        return {
          fromTable,
          fromColumn: row.from_column,
          toTable,
          toColumn: row.to_column,
          suggestedSql: `\${${fromCube}}.${row.from_column} = \${${toCube}}.${row.to_column}`,
        };
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось прочитать FK';
    return { error: message };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
