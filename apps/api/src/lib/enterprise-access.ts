import type { BillingPlanId } from '@sellerpool/core';

export function isEnterprisePlan(planId: BillingPlanId) {
  return planId === 'enterprise';
}
