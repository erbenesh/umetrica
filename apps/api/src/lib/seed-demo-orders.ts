import { randomUUID } from 'node:crypto';

import { count, eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { ensureOrdersTable, orders } from '../db/orders.js';

const STATUSES = ['completed', 'pending', 'cancelled'] as const;

export async function seedDemoOrdersForTenant(tenantId: string): Promise<{ seeded: boolean; count: number }> {
  await ensureOrdersTable(db);

  const [existing] = await db
    .select({ total: count() })
    .from(orders)
    .where(eq(orders.tenantId, tenantId));

  if ((existing?.total ?? 0) > 0) {
    return { seeded: false, count: existing?.total ?? 0 };
  }

  const rows = Array.from({ length: 50 }, (_, index) => {
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    return {
      id: randomUUID(),
      tenantId,
      status: STATUSES[index % STATUSES.length]!,
      amount: (Math.random() * 10000 + 500).toFixed(2),
      createdAt,
    };
  });

  await db.insert(orders).values(rows);

  return { seeded: true, count: rows.length };
}
