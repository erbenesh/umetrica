import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBillingCheckout,
  createCreditPackCheckout,
  fetchBilling,
  fetchBillingInvoices,
  fetchBillingPayment,
  fetchBillingPlans,
  fetchCreditPacks,
  setupMockBillingPayment,
  submitEnterpriseInquiry,
  updateBillingPayment,
  updateBillingPlan,
} from '@/lib/billing-api';

export const billingQueryKey = ['billing'] as const;
export const billingPlansQueryKey = ['billing', 'plans'] as const;
export const billingPaymentQueryKey = ['billing', 'payment'] as const;
export const billingInvoicesQueryKey = ['billing', 'invoices'] as const;
export const billingCreditPacksQueryKey = ['billing', 'credit-packs'] as const;

export function useBilling() {
  return useQuery({
    queryKey: billingQueryKey,
    queryFn: fetchBilling,
  });
}

export function useBillingPlans() {
  return useQuery({
    queryKey: billingPlansQueryKey,
    queryFn: fetchBillingPlans,
  });
}

export function useUpdateBillingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBillingPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKey });
      queryClient.invalidateQueries({ queryKey: billingPlansQueryKey });
    },
  });
}

export function useBillingPayment() {
  return useQuery({
    queryKey: billingPaymentQueryKey,
    queryFn: fetchBillingPayment,
  });
}

export function useUpdateBillingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBillingPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingPaymentQueryKey });
      queryClient.invalidateQueries({ queryKey: billingQueryKey });
    },
  });
}

export function useBillingInvoices() {
  return useQuery({
    queryKey: billingInvoicesQueryKey,
    queryFn: fetchBillingInvoices,
  });
}

export function useBillingCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBillingCheckout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKey });
      queryClient.invalidateQueries({ queryKey: billingPlansQueryKey });
      queryClient.invalidateQueries({ queryKey: billingPaymentQueryKey });
      queryClient.invalidateQueries({ queryKey: billingInvoicesQueryKey });
    },
  });
}

export function useCreditPacks() {
  return useQuery({
    queryKey: billingCreditPacksQueryKey,
    queryFn: fetchCreditPacks,
  });
}

export function useCreditPackCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCreditPackCheckout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKey });
      queryClient.invalidateQueries({ queryKey: billingInvoicesQueryKey });
      queryClient.invalidateQueries({ queryKey: billingPaymentQueryKey });
    },
  });
}

export function useMockBillingPaymentSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setupMockBillingPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingPaymentQueryKey });
      queryClient.invalidateQueries({ queryKey: billingQueryKey });
    },
  });
}

export function useEnterpriseInquiry() {
  return useMutation({
    mutationFn: submitEnterpriseInquiry,
  });
}
