import { z } from 'zod';

export const BillingPlanIdSchema = z.enum(['starter', 'pro', 'enterprise']);
export type BillingPlanId = z.infer<typeof BillingPlanIdSchema>;

export const BillingPlanSchema = z.object({
  id: BillingPlanIdSchema,
  name: z.string(),
  priceMonthly: z.string(),
  priceYearly: z.string().optional(),
  priceYearlyPerMonth: z.string().optional(),
  creditsTotal: z.number().int().positive(),
  features: z.array(z.string()),
  featureSummary: z.string(),
});

export type BillingPlan = z.infer<typeof BillingPlanSchema>;

export const BillingInvoiceSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.string(),
  status: z.enum(['paid', 'pending', 'failed']),
});

export type BillingInvoice = z.infer<typeof BillingInvoiceSchema>;

export const BillingOverviewSchema = z.object({
  planId: BillingPlanIdSchema,
  planName: z.string(),
  planPrice: z.string(),
  billingInterval: z.enum(['monthly', 'yearly']).optional(),
  planFeatures: z.string(),
  creditsUsed: z.number().int().nonnegative(),
  creditsTotal: z.number().int().positive(),
  creditsBonus: z.number().int().nonnegative().optional(),
  creditsResetAt: z.string(),
  nextBilling: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentHint: z.string().optional(),
  legalEntity: z.string().optional(),
  legalHint: z.string().optional(),
  invoices: z.array(BillingInvoiceSchema),
});

export type BillingOverview = z.infer<typeof BillingOverviewSchema>;

export const BillingPlansResponseSchema = z.object({
  currentPlanId: BillingPlanIdSchema,
  currentInterval: z.enum(['monthly', 'yearly']),
  plans: z.array(BillingPlanSchema),
});

export type BillingPlansResponse = z.infer<typeof BillingPlansResponseSchema>;

export const UpdateBillingPlanSchema = z.object({
  planId: BillingPlanIdSchema,
});

export type UpdateBillingPlanInput = z.infer<typeof UpdateBillingPlanSchema>;

export const BILLING_PLAN_CATALOG: Record<BillingPlanId, BillingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: '4 900 ₽',
    creditsTotal: 20,
    featureSummary: '3 участника · CSV · 20 AI-инсайтов',
    features: [
      '3 участника',
      'Рыночные инсайты WB/Ozon',
      'CSV-загрузка отчётов',
      '20 AI-инсайтов / мес',
      'Базовая поддержка',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: '12 900 ₽',
    creditsTotal: 100,
    featureSummary: '15 участников · API · 100 AI-инсайтов',
    features: [
      '15 участников',
      'API маркетплейсов',
      '100 AI-инсайтов / мес',
      'Бенчмарки (opt-in)',
      'Приоритетная поддержка',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 'от 49 000 ₽',
    creditsTotal: 1000,
    featureSummary: 'Безлимит участников · SSO · SLA',
    features: [
      'Безлимит участников',
      'SSO / SAML',
      'Audit log',
      'Свой LLM endpoint',
      'SLA и выделенный менеджер',
    ],
  },
};

export function getBillingPlan(planId: BillingPlanId): BillingPlan {
  return BILLING_PLAN_CATALOG[planId];
}

/** Monthly price in RUB (integer) for checkout */
export const BILLING_PLAN_PRICE_RUB: Record<BillingPlanId, number> = {
  starter: 4900,
  pro: 12900,
  enterprise: 49000,
};

export const BillingIntervalSchema = z.enum(['monthly', 'yearly']);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

export const YEARLY_BILLING_DISCOUNT = 0.15;

export function formatRubPrice(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPlanCheckoutPriceRub(planId: BillingPlanId, interval: BillingInterval) {
  const monthly = BILLING_PLAN_PRICE_RUB[planId];
  if (interval === 'yearly') {
    return Math.round(monthly * 12 * (1 - YEARLY_BILLING_DISCOUNT));
  }
  return monthly;
}

export function enrichBillingPlan(plan: BillingPlan): BillingPlan {
  const yearlyRub = getPlanCheckoutPriceRub(plan.id, 'yearly');
  const yearlyPerMonthRub = Math.round(yearlyRub / 12);

  return {
    ...plan,
    priceYearly: formatRubPrice(yearlyRub),
    priceYearlyPerMonth: formatRubPrice(yearlyPerMonthRub),
  };
}

export const CreateCheckoutSchema = z.object({
  planId: BillingPlanIdSchema,
  interval: BillingIntervalSchema,
});

export type CreateCheckoutInput = {
  planId: BillingPlanId;
  interval: BillingInterval;
};

export const BillingPaymentMethodSchema = z.object({
  brand: z.string(),
  last4: z.string().length(4),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2024),
});

export type BillingPaymentMethod = z.infer<typeof BillingPaymentMethodSchema>;

export const BillingPayerDetailsSchema = z.object({
  payerType: z.enum(['legal', 'sole', 'individual']),
  name: z.string().min(1).max(200),
  inn: z.string().max(12).optional(),
  kpp: z.string().max(9).optional(),
  email: z.string().email(),
  address: z.string().max(300).optional(),
});

export type BillingPayerDetails = z.infer<typeof BillingPayerDetailsSchema>;

export const BillingPaymentSettingsSchema = z.object({
  paymentMethod: BillingPaymentMethodSchema.optional(),
  autopay: z.boolean(),
  payer: BillingPayerDetailsSchema.optional(),
});

export type BillingPaymentSettings = z.infer<typeof BillingPaymentSettingsSchema>;

export const UpdateBillingPaymentSettingsSchema = BillingPaymentSettingsSchema.partial();

export type UpdateBillingPaymentSettingsInput = z.infer<
  typeof UpdateBillingPaymentSettingsSchema
>;

export const EnterpriseInquirySchema = z.object({
  email: z.string().email(),
  note: z.string().max(2000).optional(),
});

export type EnterpriseInquiryInput = z.infer<typeof EnterpriseInquirySchema>;

export const CheckoutResponseSchema = z.object({
  status: z.enum(['completed', 'redirect', 'pending']),
  planId: BillingPlanIdSchema.optional(),
  confirmationUrl: z.string().url().optional(),
  paymentId: z.string().optional(),
});

export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

export const CreditPackIdSchema = z.enum(['pack_50', 'pack_150', 'pack_500']);
export type CreditPackId = z.infer<typeof CreditPackIdSchema>;

export const CreditPackSchema = z.object({
  id: CreditPackIdSchema,
  credits: z.number().int().positive(),
  priceRub: z.number().int().positive(),
  priceLabel: z.string(),
  hint: z.string(),
});

export type CreditPack = z.infer<typeof CreditPackSchema>;

export const CREDIT_PACK_CATALOG: Record<CreditPackId, CreditPack> = {
  pack_50: {
    id: 'pack_50',
    credits: 50,
    priceRub: 1990,
    priceLabel: '1 990 ₽',
    hint: '~40 ₽ за инсайт',
  },
  pack_150: {
    id: 'pack_150',
    credits: 150,
    priceRub: 4990,
    priceLabel: '4 990 ₽',
    hint: '~33 ₽ за инсайт',
  },
  pack_500: {
    id: 'pack_500',
    credits: 500,
    priceRub: 14900,
    priceLabel: '14 900 ₽',
    hint: '~30 ₽ за инсайт',
  },
};

export const CREDIT_PACK_PRICE_RUB: Record<CreditPackId, number> = {
  pack_50: 1990,
  pack_150: 4990,
  pack_500: 14900,
};

export function getCreditPack(packId: CreditPackId): CreditPack {
  return CREDIT_PACK_CATALOG[packId];
}

export const CreateCreditPackCheckoutSchema = z.object({
  packId: CreditPackIdSchema,
});

export type CreateCreditPackCheckoutInput = z.infer<typeof CreateCreditPackCheckoutSchema>;

export const CreditPackCheckoutResponseSchema = CheckoutResponseSchema.extend({
  packId: CreditPackIdSchema.optional(),
  creditsAdded: z.number().int().positive().optional(),
});

export type CreditPackCheckoutResponse = z.infer<typeof CreditPackCheckoutResponseSchema>;
