import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { organization } from './schema.js';

export const semanticCubes = pgTable(
  'semantic_cubes',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    subtitle: text('subtitle').notNull(),
    draftDefinition: jsonb('draft_definition').$type<unknown>().notNull(),
    publishedDefinition: jsonb('published_definition').$type<unknown>().notNull(),
    graphLayout: jsonb('graph_layout').$type<unknown>().notNull().default({}),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('semantic_cubes_org_id_idx').on(table.organizationId),
    uniqueIndex('semantic_cubes_org_name_idx').on(table.organizationId, table.name),
  ]
);
