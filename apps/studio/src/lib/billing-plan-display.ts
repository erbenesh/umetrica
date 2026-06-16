import {
  formatRubPrice,
  getBillingPlan,
  getPlanCheckoutPriceRub,
  type BillingInterval,
  type BillingPlan,
  type BillingPlanId,
} from '@sellerpool/core';

export function getPlanPriceDisplay(planId: BillingPlanId, period: BillingInterval) {
  const plan = getBillingPlan(planId);

  if (period === 'monthly') {
    return {
      price: plan.priceMonthly,
      note: planId === 'enterprise' ? 'в месяц · договор' : 'в месяц',
      amountRub: getPlanCheckoutPriceRub(planId, 'monthly'),
    };
  }

  const yearlyRub = getPlanCheckoutPriceRub(planId, 'yearly');
  const perMonthRub = Math.round(yearlyRub / 12);
  const monthlyTotalRub = getPlanCheckoutPriceRub(planId, 'monthly') * 12;

  return {
    price: formatRubPrice(yearlyRub),
    note:
      planId === 'enterprise'
        ? `≈ ${formatRubPrice(perMonthRub)} / мес · договор`
        : `≈ ${formatRubPrice(perMonthRub)} / мес · оплата за год`,
    amountRub: yearlyRub,
    savingsRub: monthlyTotalRub - yearlyRub,
  };
}

export function getPlanPriceDisplayFromPlan(plan: BillingPlan, period: BillingInterval) {
  return getPlanPriceDisplay(plan.id, period);
}
