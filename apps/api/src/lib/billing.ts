import { desc, eq } from 'drizzle-orm';

import {
  formatRubPrice,
  getBillingPlan,
  getPlanCheckoutPriceRub,
  type BillingOverview,
  type BillingPlanId,
} from '@umetrica/core';
import { and, gte } from 'drizzle-orm';

import { insightRuns } from '../db/insight-runs.js';
import { db } from '../db/index.js';
import { organization } from '../db/schema.js';
import { listBillingInvoices } from './billing-invoices.js';
import { getBillingPaymentSettings, getBonusCredits, getOrgBillingInterval, getOrgPlanId } from './org-metadata.js';

function monthStart() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function nextMonthStartLabel() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(1);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function nextYearStartLabel() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatPaymentMethod(brand: string, last4: string) {
  return `${brand} ·••• ${last4}`;
}

export async function getBillingOverview(organizationId: string): Promise<BillingOverview> {
  const planId = await getOrgPlanId(organizationId);
  const billingInterval = await getOrgBillingInterval(organizationId);
  const plan = getBillingPlan(planId);
  const payment = await getBillingPaymentSettings(organizationId);

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const monthRows = await db
    .select({ creditsUsed: insightRuns.creditsUsed })
    .from(insightRuns)
    .where(
      and(
        eq(insightRuns.organizationId, organizationId),
        gte(insightRuns.createdAt, monthStart())
      )
    );

  const creditsUsed = monthRows.reduce((sum, row) => sum + row.creditsUsed, 0);
  const creditsBonus = await getBonusCredits(organizationId);
  const creditsResetAt = nextMonthStartLabel();
  const nextBillingAt =
    billingInterval === 'yearly' ? nextYearStartLabel() : creditsResetAt;
  const invoices = await listBillingInvoices(organizationId, 5);
  const planPrice =
    billingInterval === 'yearly'
      ? `${formatRubPrice(getPlanCheckoutPriceRub(planId, 'yearly'))} / год`
      : `${plan.priceMonthly} / мес`;

  const paymentMethod = payment.paymentMethod
    ? formatPaymentMethod(payment.paymentMethod.brand, payment.paymentMethod.last4)
    : undefined;

  const provider = process.env.PAYMENT_PROVIDER ?? 'mock';
  const paymentHint = paymentMethod
    ? payment.autopay
      ? billingInterval === 'yearly'
        ? `Автоплатёж включён · списание раз в год · ${nextBillingAt}`
        : 'Автоплатёж включён · списание 1-го числа каждого месяца'
      : 'Автоплатёж выключен'
    : provider === 'yookassa'
      ? 'Подключите карту через YooKassa'
      : 'Добавьте карту для оплаты подписки';

  return {
    planId,
    planName: plan.name,
    planPrice,
    billingInterval,
    planFeatures: plan.featureSummary,
    creditsUsed,
    creditsTotal: plan.creditsTotal + creditsBonus,
    creditsBonus: creditsBonus > 0 ? creditsBonus : undefined,
    creditsResetAt,
    nextBilling: paymentMethod && payment.autopay ? nextBillingAt : undefined,
    paymentMethod,
    paymentHint,
    legalEntity: payment.payer?.name ?? org?.name,
    legalHint: payment.payer?.inn ? `ИНН ${payment.payer.inn}` : 'Реквизиты для счёта и актов',
    invoices,
  };
}

export async function getAvailableCredits(organizationId: string) {
  const overview = await getBillingOverview(organizationId);
  return {
    creditsUsed: overview.creditsUsed,
    creditsTotal: overview.creditsTotal,
    available: Math.max(0, overview.creditsTotal - overview.creditsUsed),
  };
}

export function isPaidPlan(planId: BillingPlanId) {
  return planId !== 'starter';
}
