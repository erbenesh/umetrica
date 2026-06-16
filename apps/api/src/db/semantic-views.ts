import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { organization } from './schema.js';

export const semanticViews = pgTable(
  'semantic_views',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    title: text('title').notNull(),
    draftDefinition: jsonb('draft_definition').$type<unknown>().notNull(),
    publishedDefinition: jsonb('published_definition').$type<unknown>().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('semantic_views_org_id_idx').on(table.organizationId),
    uniqueIndex('semantic_views_org_name_idx').on(table.organizationId, table.name),
  ]
);
