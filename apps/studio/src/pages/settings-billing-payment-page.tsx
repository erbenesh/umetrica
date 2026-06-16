import { Loader2, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CheckboxRow } from '@/components/doc/checkbox-row';
import { DocBlock } from '@/components/doc/doc-block';
import { DocBlockHead } from '@/components/doc/doc-block-head';
import { DocPage } from '@/components/doc/doc-page';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { StatusBadge } from '@/components/doc/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBilling, useBillingCheckout, useBillingPayment, useMockBillingPaymentSetup, useUpdateBillingPayment } from '@/hooks/use-billing';
import { useMe } from '@/hooks/use-me';

export function SettingsBillingPaymentPage() {
  const { data: me } = useMe();
  const { data: billing } = useBilling();
  const { data: payment, isLoading } = useBillingPayment();
  const updatePayment = useUpdateBillingPayment();
  const checkout = useBillingCheckout();
  const mockPaymentSetup = useMockBillingPaymentSetup();

  const [payerType, setPayerType] = useState<'legal' | 'sole' | 'individual'>('legal');
  const [name, setName] = useState('');
  const [inn, setInn] = useState('');
  const [kpp, setKpp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [autopay, setAutopay] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payment) return;
    setAutopay(payment.autopay);
    if (payment.payer) {
      setPayerType(payment.payer.payerType);
      setName(payment.payer.name);
      setInn(payment.payer.inn ?? '');
      setKpp(payment.payer.kpp ?? '');
      setEmail(payment.payer.email);
      setAddress(payment.payer.address ?? '');
    } else if (me?.user.email) {
      setEmail(me.user.email);
    }
  }, [payment, me?.user.email]);

  const handleSave = async () => {
    setError(null);

    try {
      await updatePayment.mutateAsync({
        autopay,
        payer: {
          payerType,
          name,
          inn: inn || undefined,
          kpp: kpp || undefined,
          email,
          address: address || undefined,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const handleAddCard = async () => {
    setError(null);

    try {
      const hasPaidPlan = billing?.planId != null && billing.planId !== 'starter';

      if (hasPaidPlan) {
        await mockPaymentSetup.mutateAsync();
        return;
      }

      const result = await checkout.mutateAsync({
        planId: billing?.planId ?? 'pro',
        interval: billing?.billingInterval ?? 'monthly',
      });
      if (result.status === 'redirect' && result.confirmationUrl) {
        window.location.href = result.confirmationUrl;
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подключить карту');
    }
  };

  const isCardPending = checkout.isPending || mockPaymentSetup.isPending;
  const billingInterval = billing?.billingInterval ?? 'monthly';

  return (
    <DocPage
      title="Способ оплаты"
      lead="Карта для автоплатежа и реквизиты для счетов и актов"
      icon={Wallet}
      back={{ to: '/settings/billing', label: 'Биллинг' }}
      mobileTitle="Оплата"
      mobileSubtitle={me?.organization?.name}
    >
      {isLoading ? (
        <Card className="mb-4">
          <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Загрузка...
          </CardContent>
        </Card>
      ) : null}

      <DocBlock>
        <DocBlockHead
          title="Карта"
          actions={
            <Button size="sm" type="button" disabled={isCardPending} onClick={handleAddCard}>
              {payment?.paymentMethod ? 'Изменить' : 'Добавить'}
            </Button>
          }
        />
        <SettingsGroup>
          <SettingsRow label="">
            <div>
              <div className="settings-row__label">
                {payment?.paymentMethod
                  ? `${payment.paymentMethod.brand} ·••• ${payment.paymentMethod.last4}`
                  : 'Не подключено'}
              </div>
              <div className="settings-row__hint">
                {payment?.paymentMethod
                  ? `Истекает ${String(payment.paymentMethod.expMonth).padStart(2, '0')}/${payment.paymentMethod.expYear}`
                  : 'В dev-режиме добавление карты симулирует оплату без смены тарифа'}
              </div>
            </div>
            {payment?.paymentMethod ? <StatusBadge variant="success">По умолчанию</StatusBadge> : null}
          </SettingsRow>
        </SettingsGroup>
        <CheckboxRow className="mt-3">
          <input
            type="checkbox"
            checked={autopay}
            onChange={(event) => setAutopay(event.target.checked)}
          />
          <span>
            Автоплатёж подписки{' '}
            {billingInterval === 'yearly'
              ? 'раз в год в дату продления'
              : '1-го числа каждого месяца'}
          </span>
        </CheckboxRow>
      </DocBlock>

      <DocBlock title="Плательщик">
        <div className="form-fields max-w-lg">
          <div className="field">
            <label htmlFor="payer-type">Тип</label>
            <select
              id="payer-type"
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={payerType}
              onChange={(event) =>
                setPayerType(event.target.value as 'legal' | 'sole' | 'individual')
              }
            >
              <option value="legal">Юридическое лицо (РФ)</option>
              <option value="sole">ИП</option>
              <option value="individual">Физическое лицо</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="payer-name">Название</label>
            <input
              id="payer-name"
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="payer-inn">ИНН</label>
              <input
                id="payer-inn"
                className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                value={inn}
                onChange={(event) => setInn(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="payer-kpp">КПП</label>
              <input
                id="payer-kpp"
                className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                value={kpp}
                onChange={(event) => setKpp(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="payer-email">Email для счетов</label>
            <input
              id="payer-email"
              type="email"
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="payer-address">Юридический адрес</label>
            <input
              id="payer-address"
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-xs text-insight-warning">{error}</p> : null}

        <div className="form-actions max-w-lg">
          <Button type="button" onClick={handleSave} disabled={updatePayment.isPending}>
            {updatePayment.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Link to="/settings/billing/invoices" className="text-center text-[13px] text-primary hover:underline">
            История счетов →
          </Link>
        </div>
      </DocBlock>
    </DocPage>
  );
}
