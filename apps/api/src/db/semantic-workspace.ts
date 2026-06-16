import { jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { organization } from './schema.js';

export const semanticWorkspace = pgTable(
  'semantic_workspace',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    layout: jsonb('layout').$type<unknown>().notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('semantic_workspace_org_idx').on(table.organizationId)]
);
