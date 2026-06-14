import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, numeric, index } from 'drizzle-orm/pg-core';

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    status: text('status').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('orders_tenant_id_idx').on(table.tenantId),
    index('orders_created_at_idx').on(table.createdAt),
  ]
);

export async function ensureOrdersTable(db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      status TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS orders_tenant_id_idx ON orders (tenant_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at)
  `);
}
