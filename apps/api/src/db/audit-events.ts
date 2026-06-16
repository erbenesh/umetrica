import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organization } from './schema.js';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id'),
    actorName: text('actor_name').notNull(),
    action: text('action').notNull(),
    objectLabel: text('object_label').notNull(),
    category: text('category').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_events_org_idx').on(table.organizationId),
    index('audit_events_org_created_idx').on(table.organizationId, table.createdAt),
  ]
);
