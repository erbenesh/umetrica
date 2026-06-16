import type { BillingInterval, BillingPlanId } from '@umetrica/core';
import { Layers, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { EnterpriseInquiryDialog } from '@/components/billing/enterprise-inquiry-dialog';
import { PlanCheckoutDialog } from '@/components/billing/plan-checkout-dialog';
import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBillingPlans } from '@/hooks/use-billing';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { getPlanPriceDisplayFromPlan } from '@/lib/billing-plan-display';
import { cn } from '@/lib/utils';

function PlanCard({
  name,
  price,
  priceNote,
  features,
  active,
  canChange,
  ctaLabel,
  onSelect,
}: {
  name: string;
  price: string;
  priceNote: string;
  features: string[];
  active?: boolean;
  canChange: boolean;
  ctaLabel: string;
  onSelect: () => void;
}) {
  return (
    <article
      className={cn(
        'flex flex-col rounded-lg border border-border bg-card p-4',
        active && 'border-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_25%,transparent)]'
      )}
    >
      <h3 className="m-0 text-base font-semibold">{name}</h3>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{price}</p>
      <p className="text-xs text-muted-foreground">{priceNote}</p>
      <ul className="my-4 flex-1 space-y-1.5 text-[13px] text-muted-foreground">
        {features.map((feature) => (
          <li key={feature}>· {feature}</li>
        ))}
      </ul>
      <Button
        variant={active ? 'outline' : 'default'}
        className="w-full"
        type="button"
        disabled={active || !canChange}
        onClick={onSelect}
      >
        {active ? 'Текущий тариф' : ctaLabel}
      </Button>
    </article>
  );
}

export function SettingsBillingPlansPage() {
  const { data: me } = useMe();
  const canWrite = useCanWriteDashboards();
  const { data, isLoading, error } = useBillingPlans();
  const [period, setPeriod] = useState<BillingInterval>('monthly');
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<BillingPlanId | null>(null);
  const periodTouchedRef = useRef(false);

  useEffect(() => {
    if (data?.currentInterval && !periodTouchedRef.current) {
      setPeriod(data.currentInterval);
    }
  }, [data?.currentInterval]);

  const currentPlan = data?.plans.find((plan) => plan.id === data.currentPlanId);
  const intervalChangeOnly =
    data?.currentPlanId != null &&
    data.currentPlanId !== 'starter' &&
    data.currentPlanId !== 'enterprise' &&
    period !== (data.currentInterval ?? 'monthly');

  const handlePeriodChange = (value: BillingInterval) => {
    periodTouchedRef.current = true;
    setPeriod(value);
  };

  const handleSelectPlan = (planId: BillingPlanId) => {
    if (planId === data?.currentPlanId && period === (data?.currentInterval ?? 'monthly')) {
      return;
    }

    if (planId === 'enterprise') {
      setEnterpriseOpen(true);
      return;
    }

    setCheckoutPlanId(planId);
  };

  return (
    <DocPage
      title="Выберите тариф"
      lead="Оплата за компанию — рыночные инсайты на всех тарифах"
      icon={Layers}
      back={{ to: '/settings/billing', label: 'Биллинг' }}
      mobileTitle="Тарифы"
      mobileSubtitle={me?.organization?.name}
    >
      {isLoading ? (
        <Card className="mb-4">
          <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Загрузка тарифов...
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="mb-4">
          <CardContent className="p-3 text-xs text-destructive">
            {error instanceof Error ? error.message : 'Ошибка загрузки'}
          </CardContent>
        </Card>
      ) : null}

      <DocBlock>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
            {(['monthly', 'yearly'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePeriodChange(value)}
                className={cn(
                  'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                  period === value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {value === 'monthly' ? 'Ежемесячно' : 'Ежегодно −15%'}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            Сейчас: <strong className="text-foreground">{currentPlan?.name ?? '—'}</strong>
            {data?.currentInterval === 'yearly' ? ' · год' : ' · месяц'}
          </span>
        </div>

        {intervalChangeOnly && data?.currentPlanId ? (
          <Card className="mb-4 border-primary/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
              <p className="m-0 text-[13px] text-muted-foreground">
                {period === 'yearly'
                  ? 'Перейдите на годовую оплату со скидкой 15% — спишется сумма за весь год.'
                  : 'Перейдите на помесячную оплату — спишется сумма за месяц.'}
              </p>
              <Button
                type="button"
                size="sm"
                disabled={!canWrite}
                onClick={() => setCheckoutPlanId(data.currentPlanId)}
              >
                {period === 'yearly' ? 'Оплатить за год' : 'Оплатить за месяц'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {data?.plans.map((plan) => {
            const display = getPlanPriceDisplayFromPlan(plan, period);
            const isEnterprise = plan.id === 'enterprise';
            const isCurrent =
              plan.id === data.currentPlanId && period === (data.currentInterval ?? 'monthly');

            return (
              <PlanCard
                key={`${plan.id}-${period}`}
                name={plan.name}
                price={display.price}
                priceNote={display.note}
                features={plan.features}
                active={isCurrent}
                canChange={canWrite}
                ctaLabel={
                  isEnterprise
                    ? 'Связаться с нами'
                    : isCurrent
                      ? 'Текущий тариф'
                      : plan.id === data.currentPlanId
                        ? period === 'yearly'
                          ? 'Перейти на год'
                          : 'Перейти на месяц'
                        : 'Выбрать'
                }
                onSelect={() => handleSelectPlan(plan.id)}
              />
            );
          })}
        </div>

        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          При понижении тарифа изменения вступают со следующего периода. AI-кредиты не переносятся.
        </p>

        <p className="mt-2 text-center text-[13px] text-muted-foreground">
          <Link to="/settings/billing" className="text-primary hover:underline">
            ← Назад к биллингу
          </Link>
        </p>
      </DocBlock>

      <PlanCheckoutDialog
        open={checkoutPlanId != null}
        planId={checkoutPlanId}
        period={period}
        currentPlanId={data?.currentPlanId}
        onClose={() => setCheckoutPlanId(null)}
      />

      <EnterpriseInquiryDialog open={enterpriseOpen} onClose={() => setEnterpriseOpen(false)} />
    </DocPage>
  );
}
