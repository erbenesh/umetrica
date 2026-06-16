import type {
  BillingOverview,
  BillingPaymentSettings,
  BillingPlansResponse,
  CheckoutResponse,
  CreateCheckoutInput,
  CreateCreditPackCheckoutInput,
  CreditPack,
  CreditPackCheckoutResponse,
  EnterpriseInquiryInput,
  UpdateBillingPaymentSettingsInput,
  UpdateBillingPlanInput,
} from '@sellerpool/core';
import type { BillingInvoice } from '@sellerpool/core';

import { apiFetch } from '@/lib/api-client';

export function fetchBilling() {
  return apiFetch<BillingOverview>('/api/billing');
}

export function fetchBillingPlans() {
  return apiFetch<BillingPlansResponse>('/api/billing/plans');
}

export function updateBillingPlan(input: UpdateBillingPlanInput) {
  return apiFetch<BillingOverview>('/api/billing/plan', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function fetchBillingPayment() {
  return apiFetch<BillingPaymentSettings>('/api/billing/payment');
}

export function updateBillingPayment(input: UpdateBillingPaymentSettingsInput) {
  return apiFetch<BillingPaymentSettings>('/api/billing/payment', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function fetchBillingInvoices() {
  return apiFetch<{ items: BillingInvoice[]; total: number }>('/api/billing/invoices');
}

export function createBillingCheckout(input: CreateCheckoutInput) {
  return apiFetch<CheckoutResponse>('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function setupMockBillingPayment() {
  return apiFetch<BillingPaymentSettings>('/api/billing/payment/mock-setup', {
    method: 'POST',
  });
}

export function fetchCreditPacks() {
  return apiFetch<{ packs: CreditPack[] }>('/api/billing/credit-packs');
}

export function createCreditPackCheckout(input: CreateCreditPackCheckoutInput) {
  return apiFetch<CreditPackCheckoutResponse>('/api/billing/checkout/credits', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function submitEnterpriseInquiry(input: EnterpriseInquiryInput) {
  return apiFetch<{ ok: true }>('/api/billing/enterprise-inquiry', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
