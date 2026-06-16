import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organization, user } from './schema.js';

export const connections = pgTable(
  'connections',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    provider: text('provider').notNull(),
    name: text('name').notNull(),
    method: text('method').notNull(),
    status: text('status').notNull().default('pending'),
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
    credentialsEnc: text('credentials_enc'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('connections_org_id_idx').on(table.organizationId),
    index('connections_org_kind_idx').on(table.organizationId, table.kind),
  ]
);
