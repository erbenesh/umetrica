import { sql } from 'drizzle-orm';
import { integer, numeric, pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';

type SqlClient = { execute: (query: ReturnType<typeof sql>) => Promise<unknown> };

export const customers = pgTable(
  'customers',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    email: text('email').notNull(),
    city: text('city').notNull(),
    segment: text('segment').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('customers_tenant_id_idx').on(table.tenantId)]
);

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('products_tenant_id_idx').on(table.tenantId)]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    orderId: text('order_id').notNull(),
    productId: text('product_id').notNull(),
    quantity: integer('quantity').notNull().default(1),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('order_items_tenant_id_idx').on(table.tenantId),
    index('order_items_order_id_idx').on(table.orderId),
  ]
);

export async function ensureDemoSemanticTables(db: SqlClient) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT NOT NULL,
      city TEXT NOT NULL,
      segment TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS customers_tenant_id_idx ON customers (tenant_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS products_tenant_id_idx ON products (tenant_id)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS order_items_tenant_id_idx ON order_items (tenant_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id)
  `);

  await db.execute(sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id TEXT
  `);
}
