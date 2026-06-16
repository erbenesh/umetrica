import { randomUUID } from 'node:crypto';

import {
  getBillingPlan,
  getCreditPack,
  getPlanCheckoutPriceRub,
  type BillingInvoice,
  type BillingInterval,
  type BillingPlanId,
  type CreditPackId,
} from '@sellerpool/core';
import { desc, eq } from 'drizzle-orm';

import { billingInvoices } from '../db/billing-invoices.js';
import { db } from '../db/index.js';

function formatRub(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatInvoiceDate(value: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export async function listBillingInvoices(organizationId: string, limit = 20): Promise<BillingInvoice[]> {
  const rows = await db
    .select()
    .from(billingInvoices)
    .where(eq(billingInvoices.organizationId, organizationId))
    .orderBy(desc(billingInvoices.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    date: formatInvoiceDate(row.createdAt),
    description: row.description,
    amount: formatRub(Number(row.amountRub)),
    status: row.status as BillingInvoice['status'],
  }));
}

function formatPlanInvoiceDescription(planName: string, interval: BillingInterval) {
  return interval === 'yearly'
    ? `Подписка ${planName} · год`
    : `Подписка ${planName} · месяц`;
}

export async function createPaidInvoice(input: {
  organizationId: string;
  planId: BillingPlanId;
  provider: string;
  externalId?: string;
  interval?: BillingInterval;
}) {
  const plan = getBillingPlan(input.planId);
  const interval = input.interval ?? 'monthly';
  const amountRub = getPlanCheckoutPriceRub(input.planId, interval);
  const now = new Date();
  const id = randomUUID();

  await db.insert(billingInvoices).values({
    id,
    organizationId: input.organizationId,
    planId: input.planId,
    description: formatPlanInvoiceDescription(plan.name, interval),
    amountRub: String(amountRub),
    status: 'paid',
    provider: input.provider,
    externalId: input.externalId,
    createdAt: now,
    paidAt: now,
  });

  return id;
}

export async function markInvoicePaid(externalId: string, organizationId: string) {
  const [row] = await db
    .select()
    .from(billingInvoices)
    .where(eq(billingInvoices.externalId, externalId))
    .limit(1);

  if (!row || row.organizationId !== organizationId) {
    return null;
  }

  await db
    .update(billingInvoices)
    .set({ status: 'paid', paidAt: new Date() })
    .where(eq(billingInvoices.id, row.id));

  return row;
}

export async function createPendingInvoice(input: {
  organizationId: string;
  planId: BillingPlanId;
  provider: string;
  externalId: string;
  interval?: BillingInterval;
}) {
  const plan = getBillingPlan(input.planId);
  const interval = input.interval ?? 'monthly';
  const amountRub = getPlanCheckoutPriceRub(input.planId, interval);
  const now = new Date();
  const id = randomUUID();

  await db.insert(billingInvoices).values({
    id,
    organizationId: input.organizationId,
    planId: input.planId,
    description: formatPlanInvoiceDescription(plan.name, interval),
    amountRub: String(amountRub),
    status: 'pending',
    provider: input.provider,
    externalId: input.externalId,
    createdAt: now,
  });

  return id;
}

export async function createCreditPackPaidInvoice(input: {
  organizationId: string;
  packId: CreditPackId;
  provider: string;
  externalId?: string;
}) {
  const pack = getCreditPack(input.packId);
  const now = new Date();
  const id = randomUUID();

  await db.insert(billingInvoices).values({
    id,
    organizationId: input.organizationId,
    planId: input.packId,
    description: `Пакет +${pack.credits} AI-кредитов`,
    amountRub: String(pack.priceRub),
    status: 'paid',
    provider: input.provider,
    externalId: input.externalId,
    createdAt: now,
    paidAt: now,
  });

  return id;
}

export async function createCreditPackPendingInvoice(input: {
  organizationId: string;
  packId: CreditPackId;
  provider: string;
  externalId: string;
}) {
  const pack = getCreditPack(input.packId);
  const now = new Date();
  const id = randomUUID();

  await db.insert(billingInvoices).values({
    id,
    organizationId: input.organizationId,
    planId: input.packId,
    description: `Пакет +${pack.credits} AI-кредитов`,
    amountRub: String(pack.priceRub),
    status: 'pending',
    provider: input.provider,
    externalId: input.externalId,
    createdAt: now,
  });

  return id;
}
