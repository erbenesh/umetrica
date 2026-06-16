import { getBillingPlan } from '@umetrica/core';
import { and, eq, gte } from 'drizzle-orm';
import { insightRuns } from '../db/insight-runs.js';
import { db } from '../db/index.js';
import { organization } from '../db/schema.js';
import { getOrgPlanId } from './org-metadata.js';
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
export async function getBillingOverview(organizationId) {
    const planId = await getOrgPlanId(organizationId);
    const plan = getBillingPlan(planId);
    const [org] = await db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);
    const monthRows = await db
        .select({ creditsUsed: insightRuns.creditsUsed })
        .from(insightRuns)
        .where(and(eq(insightRuns.organizationId, organizationId), gte(insightRuns.createdAt, monthStart())));
    const creditsUsed = monthRows.reduce((sum, row) => sum + row.creditsUsed, 0);
    const creditsResetAt = nextMonthStartLabel();
    return {
        planId,
        planName: plan.name,
        planPrice: `${plan.priceMonthly} / мес`,
        planFeatures: plan.featureSummary,
        creditsUsed,
        creditsTotal: plan.creditsTotal,
        creditsResetAt,
        nextBilling: creditsResetAt,
        paymentMethod: undefined,
        paymentHint: 'Оплата картой скоро — пока смена тарифа без списания',
        legalEntity: org?.name,
        legalHint: 'Реквизиты для счёта можно добавить позже',
        invoices: [],
    };
}
export async function getAvailableCredits(organizationId) {
    const overview = await getBillingOverview(organizationId);
    return {
        creditsUsed: overview.creditsUsed,
        creditsTotal: overview.creditsTotal,
        available: Math.max(0, overview.creditsTotal - overview.creditsUsed),
    };
}
