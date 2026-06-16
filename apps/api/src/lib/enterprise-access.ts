import type { BillingPlanId } from '@umetrica/core';

export function isEnterprisePlan(planId: BillingPlanId) {
  return planId === 'enterprise';
}
