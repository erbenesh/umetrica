import { z } from 'zod';

export const ConnectionKindSchema = z.enum(['marketplace', 'database', 'csv']);
export type ConnectionKind = z.infer<typeof ConnectionKindSchema>;

export const ConnectionMethodSchema = z.enum(['api', 'csv', 'jdbc']);
export type ConnectionMethod = z.infer<typeof ConnectionMethodSchema>;

export const ConnectionStatusSchema = z.enum(['active', 'pending', 'error', 'disconnected']);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const MarketplaceProviderSchema = z.enum(['wildberries', 'ozon', 'yandex_market']);
export type MarketplaceProvider = z.infer<typeof MarketplaceProviderSchema>;

export const DatabaseProviderSchema = z.enum(['postgresql', 'mysql', 'bigquery', 'clickhouse']);
export type DatabaseProvider = z.infer<typeof DatabaseProviderSchema>;

export const ConnectionConfigSchema = z.object({
  subtitle: z.string().optional(),
  category: z.string().optional(),
  reportType: z.string().optional(),
  benchmarkOptIn: z.boolean().optional(),
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  ssl: z.boolean().optional(),
  deleteAfterImport: z.boolean().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  importedRowCount: z.number().optional(),
  skippedRowCount: z.number().optional(),
  syncedRowCount: z.number().optional(),
});

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>;

export const ConnectionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  kind: ConnectionKindSchema,
  provider: z.string(),
  name: z.string(),
  method: ConnectionMethodSchema,
  status: ConnectionStatusSchema,
  config: ConnectionConfigSchema,
  lastSyncAt: z.string().datetime().optional(),
  lastError: z.string().optional(),
  hasCredentials: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Connection = z.infer<typeof ConnectionSchema>;

export const CreateMarketplaceApiConnectionSchema = z
  .object({
    provider: MarketplaceProviderSchema.default('wildberries'),
    apiKey: z.string().min(8, 'API-ключ слишком короткий'),
    clientId: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(200).optional(),
    category: z.string().max(200).optional(),
    benchmarkOptIn: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.provider === 'ozon' && !data.clientId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите Client-Id из кабинета Ozon',
        path: ['clientId'],
      });
    }
  });

export type CreateMarketplaceApiConnectionInput = z.infer<typeof CreateMarketplaceApiConnectionSchema>;

export const CreateDatabaseConnectionSchema = z.object({
  provider: DatabaseProviderSchema.default('postgresql'),
  name: z.string().min(1).max(200),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1).max(200),
  user: z.string().min(1).max(200),
  password: z.string().min(1),
  ssl: z.boolean().default(true),
});

export type CreateDatabaseConnectionInput = z.infer<typeof CreateDatabaseConnectionSchema>;

export const TestDatabaseConnectionSchema = z.union([
  CreateDatabaseConnectionSchema,
  z.object({ connectionId: z.string().uuid() }),
]);

export type TestDatabaseConnectionInput = z.infer<typeof TestDatabaseConnectionSchema>;

export const ConnectionTestResultSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  tableCount: z.number().optional(),
});

export type ConnectionTestResult = z.infer<typeof ConnectionTestResultSchema>;

export const TestMarketplaceApiConnectionSchema = z.union([
  z
    .object({
      provider: MarketplaceProviderSchema.default('wildberries'),
      apiKey: z.string().min(8, 'API-ключ слишком короткий'),
      clientId: z.string().min(1).max(50).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.provider === 'ozon' && !data.clientId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Укажите Client-Id из кабинета Ozon',
          path: ['clientId'],
        });
      }
    }),
  z.object({
    connectionId: z.string().uuid(),
  }),
]);

export type TestMarketplaceApiConnectionInput = z.infer<typeof TestMarketplaceApiConnectionSchema>;

export const CsvImportResultSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  message: z.string(),
});

export type CsvImportResult = z.infer<typeof CsvImportResultSchema>;

export const CsvUploadResponseSchema = z.object({
  connection: ConnectionSchema,
  import: CsvImportResultSchema,
});

export type CsvUploadResponse = z.infer<typeof CsvUploadResponseSchema>;

export const ConnectionSyncResultSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative().optional(),
  message: z.string(),
});

export type ConnectionSyncResult = z.infer<typeof ConnectionSyncResultSchema>;

export const MarketplaceConnectResponseSchema = z.object({
  connection: ConnectionSchema,
  sync: ConnectionSyncResultSchema,
});

export type MarketplaceConnectResponse = z.infer<typeof MarketplaceConnectResponseSchema>;
