import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { organization } from './schema.js';

export const benchmarkPoolContributions = pgTable(
  'benchmark_pool_contributions',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    periodLabel: text('period_label').notNull(),
    revenue: numeric('revenue', { precision: 14, scale: 2 }).notNull().default('0'),
    orderCount: integer('order_count').notNull().default(0),
    revenuePrev: numeric('revenue_prev', { precision: 14, scale: 2 }).notNull().default('0'),
    orderCountPrev: integer('order_count_prev').notNull().default(0),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('benchmark_pool_org_category_idx').on(table.organizationId, table.category),
    index('benchmark_pool_category_idx').on(table.category),
    index('benchmark_pool_collected_at_idx').on(table.collectedAt),
  ]
);

export async function ensureBenchmarkPoolTable(db: {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
}) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS benchmark_pool_contributions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      period_label TEXT NOT NULL,
      revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
      order_count INTEGER NOT NULL DEFAULT 0,
      revenue_prev NUMERIC(14, 2) NOT NULL DEFAULT 0,
      order_count_prev INTEGER NOT NULL DEFAULT 0,
      collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS benchmark_pool_org_category_idx
      ON benchmark_pool_contributions (organization_id, category)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS benchmark_pool_category_idx
      ON benchmark_pool_contributions (category)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS benchmark_pool_collected_at_idx
      ON benchmark_pool_contributions (collected_at)
  `);
}
