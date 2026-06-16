import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { organization } from './schema.js';
export const insights = pgTable('insights', {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
        .notNull()
        .references(() => organization.id, { onDelete: 'cascade' }),
    source: text('source').notNull().default('tenant'),
    brief: jsonb('brief').$type().notNull(),
    evaluation: jsonb('evaluation').$type().notNull(),
    provider: text('provider'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('insights_org_id_idx').on(table.organizationId),
    index('insights_org_source_idx').on(table.organizationId, table.source),
]);
