import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { organization, user } from './schema.js';
export const insightRuns = pgTable('insight_runs', {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
        .notNull()
        .references(() => organization.id, { onDelete: 'cascade' }),
    trigger: text('trigger').notNull(),
    triggeredBy: text('triggered_by').references(() => user.id, { onDelete: 'set null' }),
    insightCount: integer('insight_count').notNull().default(0),
    creditsUsed: integer('credits_used').notNull().default(1),
    result: text('result').notNull(),
    message: text('message'),
    firstInsightId: text('first_insight_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('insight_runs_org_id_idx').on(table.organizationId),
    index('insight_runs_org_created_idx').on(table.organizationId, table.createdAt),
]);
