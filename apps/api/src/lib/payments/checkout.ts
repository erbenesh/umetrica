import { randomUUID } from 'node:crypto';

import {
  CREDIT_PACK_PRICE_RUB,
  getBillingPlan,
  getCreditPack,
  getPlanCheckoutPriceRub,
  type BillingPlanId,
  type BillingInterval,
  type CheckoutResponse,
  type CreditPackCheckoutResponse,
  type CreditPackId,
} from '@sellerpool/core';
import { BRAND_NAME } from '@sellerpool/core';

import {
  createCreditPackPaidInvoice,
  createCreditPackPendingInvoice,
  createPaidInvoice,
  createPendingInvoice,
  markInvoicePaid,
} from '../billing-invoices.js';
import { addBonusCredits, setOrgPlanAndInterval, updateBillingPaymentSettings } from '../org-metadata.js';

export type CheckoutInput = {
  organizationId: string;
  planId: BillingPlanId;
  interval: BillingInterval;
  returnUrl: string;
};

export type CreditPackCheckoutInput = {
  organizationId: string;
  packId: CreditPackId;
  returnUrl: string;
};

function paymentProviderName() {
  const provider = process.env.PAYMENT_PROVIDER ?? 'mock';
  return provider === 'yookassa' ? 'yookassa' : 'mock';
}

export async function completeCheckout(input: CheckoutInput): Promise<CheckoutResponse> {
  const provider = paymentProviderName();

  if (provider === 'yookassa') {
    return createYooKassaCheckout(input);
  }

  return createMockCheckout(input);
}

export async function completeCreditPackCheckout(
  input: CreditPackCheckoutInput
): Promise<CreditPackCheckoutResponse> {
  const provider = paymentProviderName();

  if (provider === 'yookassa') {
    return createYooKassaCreditPackCheckout(input);
  }

  return createMockCreditPackCheckout(input);
}

async function createMockCreditPackCheckout(
  input: CreditPackCheckoutInput
): Promise<CreditPackCheckoutResponse> {
  const pack = getCreditPack(input.packId);

  await updateBillingPaymentSettings(input.organizationId, {
    paymentMethod: {
      brand: 'Visa',
      last4: '4242',
      expMonth: 8,
      expYear: 2028,
    },
  });

  await createCreditPackPaidInvoice({
    organizationId: input.organizationId,
    packId: input.packId,
    provider: 'mock',
    externalId: `mock_pack_${randomUUID()}`,
  });

  await addBonusCredits(input.organizationId, pack.credits);

  return {
    status: 'completed',
    packId: input.packId,
    creditsAdded: pack.credits,
    paymentId: `mock_${pack.id}`,
  };
}

async function createYooKassaCreditPackCheckout(
  input: CreditPackCheckoutInput
): Promise<CreditPackCheckoutResponse> {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    console.warn('[billing] YooKassa keys missing, falling back to mock credit pack checkout');
    return createMockCreditPackCheckout(input);
  }

  const pack = getCreditPack(input.packId);
  const amountRub = CREDIT_PACK_PRICE_RUB[input.packId];
  const idempotenceKey = randomUUID();

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify({
      amount: {
        value: amountRub.toFixed(2),
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: input.returnUrl,
      },
      description: `${BRAND_NAME} · +${pack.credits} AI-кредитов`,
      metadata: {
        organizationId: input.organizationId,
        packId: input.packId,
        purchaseType: 'credit_pack',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YooKassa error: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    id: string;
    confirmation?: { confirmation_url?: string };
  };

  await createCreditPackPendingInvoice({
    organizationId: input.organizationId,
    packId: input.packId,
    provider: 'yookassa',
    externalId: payload.id,
  });

  const confirmationUrl = payload.confirmation?.confirmation_url;
  if (!confirmationUrl) {
    throw new Error('YooKassa did not return confirmation URL');
  }

  return {
    status: 'redirect',
    packId: input.packId,
    confirmationUrl,
    paymentId: payload.id,
  };
}

async function createMockCheckout(input: CheckoutInput): Promise<CheckoutResponse> {
  const plan = getBillingPlan(input.planId);

  await updateBillingPaymentSettings(input.organizationId, {
    paymentMethod: {
      brand: 'Visa',
      last4: '4242',
      expMonth: 8,
      expYear: 2028,
    },
    autopay: true,
  });

  await createPaidInvoice({
    organizationId: input.organizationId,
    planId: input.planId,
    provider: 'mock',
    externalId: `mock_${randomUUID()}`,
    interval: input.interval,
  });

  await setOrgPlanAndInterval(input.organizationId, input.planId, input.interval);

  return {
    status: 'completed',
    planId: input.planId,
    paymentId: `mock_${plan.id}`,
  };
}

export async function setupMockPaymentMethod(organizationId: string) {
  await updateBillingPaymentSettings(organizationId, {
    paymentMethod: {
      brand: 'Visa',
      last4: '4242',
      expMonth: 8,
      expYear: 2028,
    },
    autopay: true,
  });
}

async function createYooKassaCheckout(input: CheckoutInput): Promise<CheckoutResponse> {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    console.warn('[billing] YooKassa keys missing, falling back to mock checkout');
    return createMockCheckout(input);
  }

  const amountRub = getPlanCheckoutPriceRub(input.planId, input.interval);
  const plan = getBillingPlan(input.planId);
  const idempotenceKey = randomUUID();
  const intervalLabel = input.interval === 'yearly' ? 'год' : 'месяц';

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify({
      amount: {
        value: amountRub.toFixed(2),
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: input.returnUrl,
      },
      description: `${BRAND_NAME} · ${plan.name} · ${intervalLabel}`,
      metadata: {
        organizationId: input.organizationId,
        planId: input.planId,
        interval: input.interval,
        purchaseType: 'plan',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YooKassa error: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    id: string;
    status: string;
    confirmation?: { confirmation_url?: string };
  };

  await createPendingInvoice({
    organizationId: input.organizationId,
    planId: input.planId,
    provider: 'yookassa',
    externalId: payload.id,
    interval: input.interval,
  });

  const confirmationUrl = payload.confirmation?.confirmation_url;
  if (!confirmationUrl) {
    throw new Error('YooKassa did not return confirmation URL');
  }

  return {
    status: 'redirect',
    planId: input.planId,
    confirmationUrl,
    paymentId: payload.id,
  };
}

export async function handleYooKassaWebhook(body: {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: {
      organizationId?: string;
      planId?: string;
      interval?: string;
      packId?: string;
      purchaseType?: string;
    };
  };
}) {
  if (body.event !== 'payment.succeeded' || body.object?.status !== 'succeeded') {
    return { handled: false };
  }

  const organizationId = body.object.metadata?.organizationId;
  const externalId = body.object.id;
  const purchaseType = body.object.metadata?.purchaseType;

  if (!organizationId || !externalId) {
    return { handled: false };
  }

  if (purchaseType === 'credit_pack') {
    const packId = body.object.metadata?.packId as CreditPackId | undefined;
    if (!packId) {
      return { handled: false };
    }

    const pack = getCreditPack(packId);
    await addBonusCredits(organizationId, pack.credits);

    await updateBillingPaymentSettings(organizationId, {
      paymentMethod: {
        brand: 'Карта',
        last4: '0000',
        expMonth: 12,
        expYear: 2030,
      },
    });

    await markInvoicePaid(externalId, organizationId);

    return { handled: true, organizationId, packId, creditsAdded: pack.credits };
  }

  const planId = body.object.metadata?.planId as BillingPlanId | undefined;
  const interval = body.object.metadata?.interval as BillingInterval | undefined;

  if (!planId) {
    return { handled: false };
  }

  const resolvedInterval: BillingInterval =
    interval === 'yearly' ? 'yearly' : 'monthly';

  await setOrgPlanAndInterval(organizationId, planId, resolvedInterval);

  await updateBillingPaymentSettings(organizationId, {
    paymentMethod: {
      brand: 'Карта',
      last4: '0000',
      expMonth: 12,
      expYear: 2030,
    },
  });

  await markInvoicePaid(externalId, organizationId);

  return { handled: true, organizationId, planId };
}
