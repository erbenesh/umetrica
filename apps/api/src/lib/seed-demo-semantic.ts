import { randomUUID } from 'node:crypto';

import { count, eq, sql } from 'drizzle-orm';

import { customers, orderItems, products, ensureDemoSemanticTables } from '../db/demo-semantic.js';
import { db } from '../db/index.js';
import { ensureOrdersTable, orders } from '../db/orders.js';
import { seedDemoOrdersForTenant } from './seed-demo-orders.js';

const CUSTOMER_CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск'] as const;
const CUSTOMER_SEGMENTS = ['retail', 'smb', 'vip'] as const;
const PRODUCT_CATEGORIES = ['Электроника', 'Одежда', 'Дом', 'Спорт'] as const;
const PRODUCT_NAMES = [
  'Ноутбук',
  'Смартфон',
  'Кроссовки',
  'Куртка',
  'Чайник',
  'Коврик',
  'Наушники',
  'Рюкзак',
] as const;

export async function seedDemoSemanticForTenant(tenantId: string) {
  await ensureOrdersTable(db);
  await ensureDemoSemanticTables(db);

  const ordersSeed = await seedDemoOrdersForTenant(tenantId);

  let customersSeeded = 0;
  let productsSeeded = 0;
  let orderItemsSeeded = 0;

  const [existingCustomers] = await db
    .select({ total: count() })
    .from(customers)
    .where(eq(customers.tenantId, tenantId));

  if ((existingCustomers?.total ?? 0) === 0) {
    const customerRows = Array.from({ length: 12 }, (_, index) => ({
      id: randomUUID(),
      tenantId,
      email: `customer${index + 1}@demo.local`,
      city: CUSTOMER_CITIES[index % CUSTOMER_CITIES.length]!,
      segment: CUSTOMER_SEGMENTS[index % CUSTOMER_SEGMENTS.length]!,
      createdAt: new Date(Date.now() - index * 86_400_000),
    }));

    await db.insert(customers).values(customerRows);
    customersSeeded = customerRows.length;
  }

  const [existingProducts] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.tenantId, tenantId));

  if ((existingProducts?.total ?? 0) === 0) {
    const productRows = PRODUCT_NAMES.map((name, index) => ({
      id: randomUUID(),
      tenantId,
      name,
      category: PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length]!,
      price: (1500 + index * 750 + Math.random() * 500).toFixed(2),
      createdAt: new Date(Date.now() - index * 43_200_000),
    }));

    await db.insert(products).values(productRows);
    productsSeeded = productRows.length;
  }

  const customerIdRows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.tenantId, tenantId));

  if (customerIdRows.length > 0) {
    const tenantOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.tenantId, tenantId));

    for (const [index, order] of tenantOrders.entries()) {
      await db.execute(sql`
        UPDATE orders
        SET customer_id = ${customerIdRows[index % customerIdRows.length]!.id}
        WHERE id = ${order.id} AND customer_id IS NULL
      `);
    }
  }

  const [existingOrderItems] = await db
    .select({ total: count() })
    .from(orderItems)
    .where(eq(orderItems.tenantId, tenantId));

  if ((existingOrderItems?.total ?? 0) === 0) {
    const tenantOrders = await db
      .select({ id: orders.id, createdAt: orders.createdAt })
      .from(orders)
      .where(eq(orders.tenantId, tenantId));

    const productRows = await db
      .select({ id: products.id, price: products.price })
      .from(products)
      .where(eq(products.tenantId, tenantId));

    if (tenantOrders.length > 0 && productRows.length > 0) {
      const itemRows = tenantOrders.flatMap((order, orderIndex) => {
        const lines = 2 + (orderIndex % 2);
        return Array.from({ length: lines }, (_, lineIndex) => {
          const product = productRows[(orderIndex + lineIndex) % productRows.length]!;
          const quantity = 1 + ((lineIndex + orderIndex) % 3);
          const unitPrice = Number(product.price);
          return {
            id: randomUUID(),
            tenantId,
            orderId: order.id,
            productId: product.id,
            quantity,
            amount: (unitPrice * quantity).toFixed(2),
            createdAt: order.createdAt ?? new Date(),
          };
        });
      });

      await db.insert(orderItems).values(itemRows);
      orderItemsSeeded = itemRows.length;
    }
  }

  return {
    orders: ordersSeed,
    customersSeeded,
    productsSeeded,
    orderItemsSeeded,
  };
}
