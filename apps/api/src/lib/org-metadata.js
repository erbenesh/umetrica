import { BillingPlanIdSchema, DEFAULT_INSIGHT_SETTINGS, DEFAULT_PRIVACY_SETTINGS, InsightSettingsSchema, PrivacySettingsSchema, } from '@umetrica/core';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { organization } from '../db/schema.js';
export function parseOrgMetadata(raw) {
    if (!raw)
        return {};
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object')
            return {};
        return parsed;
    }
    catch {
        return {};
    }
}
async function readOrgMetadata(organizationId) {
    const [row] = await db
        .select({ metadata: organization.metadata })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);
    return parseOrgMetadata(row?.metadata);
}
async function writeOrgMetadata(organizationId, metadata) {
    await db
        .update(organization)
        .set({ metadata: JSON.stringify(metadata) })
        .where(eq(organization.id, organizationId));
}
function mergeInsightSettings(current, patch) {
    const merged = {
        sources: { ...current.sources, ...patch.sources },
        schedule: patch.schedule ?? current.schedule,
        emailAlerts: patch.emailAlerts ?? current.emailAlerts,
        metrics: patch.metrics ?? current.metrics,
    };
    return InsightSettingsSchema.parse(merged);
}
export async function getOrgPlanId(organizationId) {
    const metadata = await readOrgMetadata(organizationId);
    const parsed = BillingPlanIdSchema.safeParse(metadata.planId);
    return parsed.success ? parsed.data : 'starter';
}
export async function setOrgPlanId(organizationId, planId) {
    const metadata = await readOrgMetadata(organizationId);
    await writeOrgMetadata(organizationId, { ...metadata, planId });
}
export async function getInsightSettings(organizationId) {
    const metadata = await readOrgMetadata(organizationId);
    const parsed = InsightSettingsSchema.safeParse(metadata.insightSettings);
    if (!parsed.success) {
        return DEFAULT_INSIGHT_SETTINGS;
    }
    return mergeInsightSettings(DEFAULT_INSIGHT_SETTINGS, parsed.data);
}
export async function updateInsightSettings(organizationId, patch) {
    const current = await getInsightSettings(organizationId);
    const next = mergeInsightSettings(current, patch);
    const metadata = await readOrgMetadata(organizationId);
    await writeOrgMetadata(organizationId, {
        ...metadata,
        insightSettings: next,
    });
    return next;
}
export async function getLastInsightScheduleAt(organizationId) {
    const metadata = await readOrgMetadata(organizationId);
    if (!metadata.lastInsightScheduleAt)
        return null;
    const date = new Date(metadata.lastInsightScheduleAt);
    return Number.isNaN(date.getTime()) ? null : date;
}
export async function setLastInsightScheduleAt(organizationId, at) {
    const metadata = await readOrgMetadata(organizationId);
    await writeOrgMetadata(organizationId, {
        ...metadata,
        lastInsightScheduleAt: at.toISOString(),
    });
}
function mergePrivacySettings(current, patch) {
    return PrivacySettingsSchema.parse({
        marketCategory: patch.marketCategory ?? current.marketCategory,
        benchmarkOptIn: patch.benchmarkOptIn ?? current.benchmarkOptIn,
    });
}
export async function getPrivacySettings(organizationId) {
    const metadata = await readOrgMetadata(organizationId);
    const parsed = PrivacySettingsSchema.safeParse(metadata.privacySettings);
    if (!parsed.success) {
        return DEFAULT_PRIVACY_SETTINGS;
    }
    return mergePrivacySettings(DEFAULT_PRIVACY_SETTINGS, parsed.data);
}
export async function updatePrivacySettings(organizationId, patch) {
    const current = await getPrivacySettings(organizationId);
    const next = mergePrivacySettings(current, patch);
    const metadata = await readOrgMetadata(organizationId);
    await writeOrgMetadata(organizationId, {
        ...metadata,
        privacySettings: next,
    });
    return next;
}
