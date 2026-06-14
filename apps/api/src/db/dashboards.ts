import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organization, user } from './schema.js';

export const dashboards = pgTable(
  'dashboards',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    widgets: jsonb('widgets').$type<unknown[]>().notNull().default([]),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('dashboards_org_id_idx').on(table.organizationId)]
);
