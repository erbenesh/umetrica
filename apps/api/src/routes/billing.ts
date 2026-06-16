import {
  BILLING_PLAN_CATALOG,
  CREDIT_PACK_CATALOG,
  CreateCheckoutSchema,
  CreateCreditPackCheckoutSchema,
  EnterpriseInquirySchema,
  UpdateBillingPaymentSettingsSchema,
  UpdateBillingPlanSchema,
  enrichBillingPlan,
  getBillingPlan,
  type BillingPlanId,
} from '@sellerpool/core';
import { BRAND_NAME } from '@sellerpool/core';
import type { FastifyInstance } from 'fastify';
import { sendValidationError } from '../lib/http-errors.js';

import { getBillingOverview, isPaidPlan } from '../lib/billing.js';
import { listBillingInvoices } from '../lib/billing-invoices.js';
import { recordAuditEvent } from '../lib/audit-log.js';
import { completeCheckout, completeCreditPackCheckout, handleYooKassaWebhook, setupMockPaymentMethod } from '../lib/payments/checkout.js';
import {
  getBillingPaymentSettings,
  getOrgBillingInterval,
  getOrgPlanId,
  saveEnterpriseInquiry,
  setOrgPlanId,
  updateBillingPaymentSettings,
} from '../lib/org-metadata.js';
import { sendEmail } from '../lib/email.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

export async function registerBillingRoutes(app: FastifyInstance) {
  app.get('/api/billing', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    return getBillingOverview(auth.organizationId);
  });

  app.get('/api/billing/plans', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const currentPlanId = await getOrgPlanId(auth.organizationId);
    const currentInterval = await getOrgBillingInterval(auth.organizationId);

    return {
      currentPlanId,
      currentInterval,
      plans: Object.values(BILLING_PLAN_CATALOG).map(enrichBillingPlan),
    };
  });

  app.get('/api/billing/payment', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    return getBillingPaymentSettings(auth.organizationId);
  });

  app.patch('/api/billing/payment', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = UpdateBillingPaymentSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return updateBillingPaymentSettings(auth.organizationId, parsed.data);
  });

  app.post('/api/billing/payment/mock-setup', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const provider = process.env.PAYMENT_PROVIDER ?? 'mock';
    if (provider !== 'mock') {
      return reply.status(400).send({ error: 'Mock setup доступен только в dev-режиме' });
    }

    await setupMockPaymentMethod(auth.organizationId);
    return getBillingPaymentSettings(auth.organizationId);
  });

  app.get('/api/billing/invoices', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const items = await listBillingInvoices(auth.organizationId, 100);
    return { items, total: items.length };
  });

  app.post('/api/billing/checkout', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = CreateCheckoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    if (!isPaidPlan(parsed.data.planId)) {
      await setOrgPlanId(auth.organizationId, parsed.data.planId);
      return { status: 'completed', planId: parsed.data.planId };
    }

    const studioUrl = process.env.STUDIO_URL ?? 'http://localhost:5173';
    const returnUrl = `${studioUrl}/settings/billing?checkout=success`;

    const result = await completeCheckout({
      organizationId: auth.organizationId,
      planId: parsed.data.planId,
      interval: parsed.data.interval,
      returnUrl,
    });

    if (result.status === 'completed') {
      const plan = getBillingPlan(parsed.data.planId);
      const { interval } = parsed.data;
      await recordAuditEvent({
        organizationId: auth.organizationId,
        userId: auth.userId,
        actorName: auth.userName,
        action: 'billing.charge',
        objectLabel: `${plan.name} · ${interval === 'yearly' ? 'год' : 'месяц'}`,
        category: 'billing',
      });
    }

    return reply.status(result.status === 'completed' ? 200 : 202).send(result);
  });

  app.post('/api/billing/enterprise-inquiry', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = EnterpriseInquirySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    await saveEnterpriseInquiry(auth.organizationId, parsed.data);

    const salesEmail = process.env.SALES_EMAIL ?? 'sales@sellerpool.ru';
    await sendEmail({
      to: salesEmail,
      subject: `Заявка на Enterprise — ${BRAND_NAME}`,
      text: [
        `Организация: ${auth.organizationId}`,
        `Контакт: ${parsed.data.email}`,
        parsed.data.note ? `Комментарий: ${parsed.data.note}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });

    return { ok: true };
  });

  app.get('/api/billing/credit-packs', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    return { packs: Object.values(CREDIT_PACK_CATALOG) };
  });

  app.post('/api/billing/checkout/credits', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = CreateCreditPackCheckoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const studioUrl = process.env.STUDIO_URL ?? 'http://localhost:5173';
    const returnUrl = `${studioUrl}/settings/billing?credits=success`;

    const result = await completeCreditPackCheckout({
      organizationId: auth.organizationId,
      packId: parsed.data.packId,
      returnUrl,
    });

    return reply.status(result.status === 'completed' ? 200 : 202).send(result);
  });

  app.post('/api/billing/webhooks/yookassa', async (request, reply) => {
    const result = await handleYooKassaWebhook(
      request.body as Parameters<typeof handleYooKassaWebhook>[0]
    );
    return reply.status(200).send(result);
  });

  app.patch('/api/billing/plan', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = UpdateBillingPlanSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    if (isPaidPlan(parsed.data.planId)) {
      return reply.status(402).send({
        error: 'Для платных тарифов используйте оплату',
        checkoutRequired: true,
        planId: parsed.data.planId,
      });
    }

    await setOrgPlanId(auth.organizationId, parsed.data.planId as BillingPlanId);

    return getBillingOverview(auth.organizationId);
  });
}
