import type { BillingInterval, BillingPlanId } from '@sellerpool/core';
import { formatRubPrice, getBillingPlan } from '@sellerpool/core';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBillingCheckout, useBillingPayment, useUpdateBillingPlan } from '@/hooks/use-billing';
import { getPlanPriceDisplay } from '@/lib/billing-plan-display';

interface PlanCheckoutDialogProps {
  open: boolean;
  planId: BillingPlanId | null;
  period: BillingInterval;
  currentPlanId?: BillingPlanId;
  onClose: () => void;
}

export function PlanCheckoutDialog({
  open,
  planId,
  period,
  currentPlanId,
  onClose,
}: PlanCheckoutDialogProps) {
  const navigate = useNavigate();
  const { data: payment } = useBillingPayment();
  const checkout = useBillingCheckout();
  const updatePlan = useUpdateBillingPlan();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open, planId, period]);

  if (!open || !planId) return null;

  const plan = getBillingPlan(planId);
  const display = getPlanPriceDisplay(planId, period);
  const isStarter = planId === 'starter';
  const isDowngrade =
    currentPlanId === 'enterprise' ||
    (currentPlanId === 'pro' && planId === 'starter');

  const paymentLabel = payment?.paymentMethod
    ? `${payment.paymentMethod.brand} ·••• ${payment.paymentMethod.last4}`
    : 'Не подключено';

  const handleConfirm = async () => {
    setError(null);

    try {
      if (isStarter) {
        await updatePlan.mutateAsync({ planId });
        onClose();
        navigate('/settings/billing', {
          replace: false,
          state: { message: 'Тариф Starter активирован со следующего периода.' },
        });
        return;
      }

      const result = await checkout.mutateAsync({ planId, interval: period });
      if (result.status === 'redirect' && result.confirmationUrl) {
        window.location.href = result.confirmationUrl;
        return;
      }

      onClose();
      navigate('/settings/billing?checkout=success', { replace: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сменить тариф');
    }
  };

  const isPending = checkout.isPending || updatePlan.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <Card className="w-full max-w-md rounded-b-none sm:rounded-b-lg">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <CardHeader className="pb-2">
          <CardTitle>{isStarter ? 'Переход на Starter' : `Переход на ${plan.name}`}</CardTitle>
          <p className="m-0 text-[13px] text-muted-foreground">
            {period === 'yearly' ? 'Годовая оплата · скидка 15%' : 'Ежемесячная оплата'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">{plan.name}</span>
              <span className="text-xl font-semibold tabular-nums">{display.price}</span>
            </div>
            <p className="m-0 mt-1 text-xs text-muted-foreground">{display.note}</p>
            {display.savingsRub != null && display.savingsRub > 0 ? (
              <p className="m-0 mt-2 text-xs text-primary">
                Экономия {formatRubPrice(display.savingsRub)} в год
              </p>
            ) : null}
          </div>

          {isDowngrade ? (
            <p className="m-0 text-[13px] text-muted-foreground">
              Понижение тарифа вступит в силу со следующего расчётного периода.
            </p>
          ) : null}

          {!isStarter ? (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <div>
                <div className="text-sm font-medium">{paymentLabel}</div>
                <div className="text-xs text-muted-foreground">Списание после подтверждения</div>
              </div>
              <Link to="/settings/billing/payment" onClick={onClose}>
                <Button variant="ghost" size="sm" type="button">
                  Изменить
                </Button>
              </Link>
            </div>
          ) : null}

          {error ? <p className="m-0 text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
              Отмена
            </Button>
            <Button type="button" disabled={isPending} onClick={() => void handleConfirm()}>
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Обработка...
                </>
              ) : isStarter ? (
                'Подтвердить'
              ) : (
                `Оплатить ${display.price}`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
