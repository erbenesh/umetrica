import {
  applyBenchmarkOptInChange,
  BillingIntervalSchema,
  BillingPlanIdSchema,
  BillingPaymentSettingsSchema,
  DEFAULT_INSIGHT_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  EnterpriseLlmSettingsSchema,
  InsightSettingsSchema,
  PrivacySettingsSchema,
  SsoSettingsSchema,
  UpdateEnterpriseLlmSettingsSchema,
  UpdateSsoSettingsSchema,
  type BillingInterval,
  type BillingPaymentSettings,
  type BillingPlanId,
  type EnterpriseLlmSettings,
  type InsightSettings,
  type PrivacySettings,
  type SsoSettings,
  type UpdateBillingPaymentSettingsInput,
  type UpdateEnterpriseLlmSettingsInput,
  type UpdateInsightSettingsInput,
  type UpdatePrivacySettingsInput,
  type UpdateSsoSettingsInput,
} from '@umetrica/core';
import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { organization } from '../db/schema.js';

type OrgMetadata = {
  planId?: string;
  billingInterval?: string;
  insightSettings?: unknown;
  privacySettings?: unknown;
  billingPayment?: unknown;
  billingBonusCredits?: number;
  enterpriseInquiry?: unknown;
  ssoSettings?: unknown;
  enterpriseLlm?: unknown;
  lastInsightScheduleAt?: string;
};

export function parseOrgMetadata(raw: string | null | undefined): OrgMetadata {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as OrgMetadata;
  } catch {
    return {};
  }
}

async function readOrgMetadata(organizationId: string) {
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return parseOrgMetadata(row?.metadata);
}

async function writeOrgMetadata(organizationId: string, metadata: OrgMetadata) {
  await db
    .update(organization)
    .set({ metadata: JSON.stringify(metadata) })
    .where(eq(organization.id, organizationId));
}

function mergeInsightSettings(
  current: InsightSettings,
  patch: UpdateInsightSettingsInput
): InsightSettings {
  const merged = {
    sources: { ...current.sources, ...patch.sources },
    schedule: patch.schedule ?? current.schedule,
    emailAlerts: patch.emailAlerts ?? current.emailAlerts,
    metrics: patch.metrics ?? current.metrics,
  };

  return InsightSettingsSchema.parse(merged);
}

export async function getOrgPlanId(organizationId: string): Promise<BillingPlanId> {
  const metadata = await readOrgMetadata(organizationId);
  const parsed = BillingPlanIdSchema.safeParse(metadata.planId);
  return parsed.success ? parsed.data : 'starter';
}

export async function setOrgPlanId(organizationId: string, planId: BillingPlanId) {
  const metadata = await readOrgMetadata(organizationId);
  await writeOrgMetadata(organizationId, { ...metadata, planId });
}

export async function setOrgPlanAndInterval(
  organizationId: string,
  planId: BillingPlanId,
  interval: BillingInterval
) {
  const metadata = await readOrgMetadata(organizationId);
  await writeOrgMetadata(organizationId, {
    ...metadata,
    planId,
    billingInterval: interval,
  });
}

export async function getOrgBillingInterval(organizationId: string): Promise<BillingInterval> {
  const metadata = await readOrgMetadata(organizationId);
  const parsed = BillingIntervalSchema.safeParse(metadata.billingInterval);
  return parsed.success ? parsed.data : 'monthly';
}

export async function setOrgBillingInterval(
  organizationId: string,
  interval: BillingInterval
) {
  const metadata = await readOrgMetadata(organizationId);
  await writeOrgMetadata(organizationId, { ...metadata, billingInterval: interval });
}

export async function saveEnterpriseInquiry(
  organizationId: string,
  input: { email: string; note?: string }
) {
  const metadata = await readOrgMetadata(organizationId);
  await writeOrgMetadata(organizationId, {
    ...metadata,
    enterpriseInquiry: {
      email: input.email,
      note: input.note,
      createdAt: new Date().toISOString(),
    },
  });
}

export async function getInsightSettings(organizationId: string): Promise<InsightSettings> {
  const metadata = await readOrgMetadata(organizationId);
  const parsed = InsightSettingsSchema.safeParse(metadata.insightSettings);

  if (!parsed.success) {
    return DEFAULT_INSIGHT_SETTINGS;
  }

  return mergeInsightSettings(DEFAULT_INSIGHT_SETTINGS, parsed.data);
}

export async function updateInsightSettings(
  organizationId: string,
  patch: UpdateInsightSettingsInput
): Promise<InsightSettings> {
  const current = await getInsightSettings(organizationId);
  const next = mergeInsightSettings(current, patch);
  const metadata = await readOrgMetadata(organizationId);

  await writeOrgMetadata(organizationId, {
    ...metadata,
    insightSettings: next,
  });

  return next;
}

export async function getLastInsightScheduleAt(organizationId: string): Promise<Date | null> {
  const metadata = await readOrgMetadata(organizationId);
  if (!metadata.lastInsightScheduleAt) return null;
  const date = new Date(metadata.lastInsightScheduleAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function setLastInsightScheduleAt(organizationId: string, at: Date) {
  const metadata = await readOrgMetadata(organizationId);
  await writeOrgMetadata(organizationId, {
    ...metadata,
    lastInsightScheduleAt: at.toISOString(),
  });
}

function mergePrivacySettings(
  current: PrivacySettings,
  patch: UpdatePrivacySettingsInput
): PrivacySettings {
  const marketCategory = patch.marketCategory ?? current.marketCategory;

  if (patch.benchmarkOptIn !== undefined) {
    const withOptIn = applyBenchmarkOptInChange(current, patch.benchmarkOptIn);
    return PrivacySettingsSchema.parse({
      ...withOptIn,
      marketCategory,
    });
  }

  return PrivacySettingsSchema.parse({
    ...current,
    marketCategory,
  });
}

export async function getPrivacySettings(organizationId: string): Promise<PrivacySettings> {
  const metadata = await readOrgMetadata(organizationId);
  const parsed = PrivacySettingsSchema.safeParse(metadata.privacySettings);

  if (!parsed.success) {
    return DEFAULT_PRIVACY_SETTINGS;
  }

  return mergePrivacySettings(DEFAULT_PRIVACY_SETTINGS, parsed.data);
}

export async function updatePrivacySettings(
  organizationId: string,
  patch: UpdatePrivacySettingsInput
): Promise<PrivacySettings> {
  const current = await getPrivacySettings(organizationId);
  const next = mergePrivacySettings(current, patch);
  const metadata = await readOrgMetadata(organizationId);

  await writeOrgMetadata(organizationId, {
    ...metadata,
    privacySettings: next,
  });

  return next;
}

const DEFAULT_BILLING_PAYMENT: BillingPaymentSettings = {
  autopay: true,
};

function mergeBillingPayment(
  current: BillingPaymentSettings,
  patch: UpdateBillingPaymentSettingsInput
): BillingPaymentSettings {
  return BillingPaymentSettingsSchema.parse({
    paymentMethod: patch.paymentMethod ?? current.paymentMethod,
    autopay: patch.autopay ?? current.autopay,
    payer: patch.payer ?? current.payer,
  });
}

export async function getBillingPaymentSettings(
  organizationId: string
): Promise<BillingPaymentSettings> {
  const metadata = await readOrgMetadata(organizationId);
  const parsed = BillingPaymentSettingsSchema.safeParse(metadata.billingPayment);

  if (!parsed.success) {
    return DEFAULT_BILLING_PAYMENT;
  }

  return mergeBillingPayment(DEFAULT_BILLING_PAYMENT, parsed.data);
}

export async function updateBillingPaymentSettings(
  organizationId: string,
  patch: UpdateBillingPaymentSettingsInput
): Promise<BillingPaymentSettings> {
  const current = await getBillingPaymentSettings(organizationId);
  const next = mergeBillingPayment(current, patch);
  const metadata = await readOrgMetadata(organizationId);

  await writeOrgMetadata(organizationId, {
    ...metadata,
    billingPayment: next,
  });

  return next;
}

export async function getBonusCredits(organizationId: string): Promise<number> {
  const metadata = await readOrgMetadata(organizationId);
  const value = metadata.billingBonusCredits;
  return typeof value === 'number' && value > 0 ? Math.floor(value) : 0;
}

export async function addBonusCredits(organizationId: string, amount: number) {
  const metadata = await readOrgMetadata(organizationId);
  const current = typeof metadata.billingBonusCredits === 'number' ? metadata.billingBonusCredits : 0;

  await writeOrgMetadata(organizationId, {
    ...metadata,
    billingBonusCredits: current + amount,
  });
}

async function getOrgSlug(organizationId: string) {
  const [row] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return row?.slug ?? organizationId;
}

export async function getSsoSettings(organizationId: string): Promise<SsoSettings> {
  const metadata = await readOrgMetadata(organizationId);
  const entityId = `umetrica-${await getOrgSlug(organizationId)}`;
  const base: SsoSettings = {
    enabled: false,
    requireForAll: false,
    entityId,
  };

  if (!metadata.ssoSettings || typeof metadata.ssoSettings !== 'object') {
    return base;
  }

  const parsed = SsoSettingsSchema.safeParse({
    ...base,
    ...(metadata.ssoSettings as Record<string, unknown>),
    entityId,
  });

  return parsed.success ? parsed.data : base;
}

export async function updateSsoSettings(
  organizationId: string,
  patch: UpdateSsoSettingsInput
): Promise<SsoSettings> {
  const current = await getSsoSettings(organizationId);
  const next = SsoSettingsSchema.parse({
    ...current,
    ...patch,
    entityId: current.entityId,
    idpSsoUrl: patch.idpSsoUrl === '' ? undefined : (patch.idpSsoUrl ?? current.idpSsoUrl),
  });

  const metadata = await readOrgMetadata(organizationId);
  await writeOrgMetadata(organizationId, {
    ...metadata,
    ssoSettings: {
      enabled: next.enabled,
      requireForAll: next.requireForAll,
      idpSsoUrl: next.idpSsoUrl,
      idpCertificate: next.idpCertificate,
    },
  });

  return next;
}

function maskApiKey(key: string) {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 3)}••••••••${key.slice(-4)}`;
}

type StoredEnterpriseLlm = {
  enabled?: boolean;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
};

export async function getEnterpriseLlmSettings(
  organizationId: string
): Promise<EnterpriseLlmSettings> {
  const metadata = await readOrgMetadata(organizationId);
  const stored = (metadata.enterpriseLlm ?? {}) as StoredEnterpriseLlm;
  const apiKey = typeof stored.apiKey === 'string' ? stored.apiKey : '';

  const base: EnterpriseLlmSettings = {
    enabled: Boolean(stored.enabled),
    provider: stored.provider === 'qwen' ? 'qwen' : 'deepseek',
    hasApiKey: apiKey.length > 0,
    apiKeyMask: apiKey ? maskApiKey(apiKey) : undefined,
    baseUrl: stored.baseUrl,
  };

  const parsed = EnterpriseLlmSettingsSchema.safeParse(base);
  return parsed.success ? parsed.data : base;
}

export async function updateEnterpriseLlmSettings(
  organizationId: string,
  patch: UpdateEnterpriseLlmSettingsInput
): Promise<EnterpriseLlmSettings> {
  const metadata = await readOrgMetadata(organizationId);
  const stored = (metadata.enterpriseLlm ?? {}) as StoredEnterpriseLlm;
  const currentApiKey = typeof stored.apiKey === 'string' ? stored.apiKey : '';

  const nextStored: StoredEnterpriseLlm = {
    enabled: patch.enabled ?? Boolean(stored.enabled),
    provider: patch.provider ?? (stored.provider === 'qwen' ? 'qwen' : 'deepseek'),
    apiKey: patch.clearApiKey ? undefined : patch.apiKey ?? (currentApiKey || undefined),
    baseUrl: patch.baseUrl === '' ? undefined : (patch.baseUrl ?? stored.baseUrl),
  };

  await writeOrgMetadata(organizationId, {
    ...metadata,
    enterpriseLlm: nextStored,
  });

  return getEnterpriseLlmSettings(organizationId);
}
