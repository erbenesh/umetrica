import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { organization } from './schema.js';

export const billingInvoices = pgTable(
  'billing_invoices',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    planId: text('plan_id').notNull(),
    description: text('description').notNull(),
    amountRub: text('amount_rub').notNull(),
    status: text('status').notNull().default('pending'),
    provider: text('provider'),
    externalId: text('external_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => [index('billing_invoices_org_idx').on(table.organizationId)]
);
