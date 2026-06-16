import { CreditCard, Loader2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { CreditPackDialog } from '@/components/billing/credit-pack-dialog';
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from '@/components/doc/data-table';
import { DocBlock } from '@/components/doc/doc-block';
import { DocBlockHead } from '@/components/doc/doc-block-head';
import { DocPage } from '@/components/doc/doc-page';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { StatusBadge } from '@/components/doc/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBilling } from '@/hooks/use-billing';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';

export function SettingsBillingPage() {
  const { data: me } = useMe();
  const canWrite = useCanWriteDashboards();
  const { data: billing, isLoading, error } = useBilling();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [creditPackOpen, setCreditPackOpen] = useState(false);

  useEffect(() => {
    const stateMessage = (location.state as { message?: string } | null)?.message;
    if (stateMessage) {
      setCheckoutNotice(stateMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setCheckoutNotice('Оплата прошла успешно — тариф и счёт обновлены.');
      const next = new URLSearchParams(searchParams);
      next.delete('checkout');
      setSearchParams(next, { replace: true });
      return;
    }

    if (searchParams.get('credits') === 'success') {
      setCheckoutNotice('Пакет AI-кредитов добавлен к квоте.');
      const next = new URLSearchParams(searchParams);
      next.delete('credits');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const creditsPct = billing
    ? Math.min(100, Math.round((billing.creditsUsed / billing.creditsTotal) * 100))
    : 0;

  return (
    <DocPage
      title="Биллинг"
      lead="Подписка, оплата, счета и AI-кредиты компании"
      icon={CreditCard}
      back="auto"
      mobileSubtitle={me?.organization?.name}
      props={
        billing
          ? [
              { label: 'Тариф', value: billing.planName },
              { label: 'След. списание', value: billing.creditsResetAt },
              {
                label: 'AI-кредиты',
                value: `${billing.creditsUsed} / ${billing.creditsTotal}`,
              },
            ]
          : []
      }
    >
      {checkoutNotice ? (
        <Card className="mb-4 border-primary/30">
          <CardContent className="p-3 text-xs text-foreground">{checkoutNotice}</CardContent>
        </Card>
      ) : null}

      {isLoading ? (        <Card className="mb-4">
          <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Загрузка биллинга...
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

      {billing ? (
        <>
          <DocBlock>
            <DocBlockHead
              title="Подписка"
              actions={
                <Link to="/settings/billing/plans">
                  <Button variant="ghost" size="sm" type="button">
                    Сменить тариф
                  </Button>
                </Link>
              }
            />
            <SettingsGroup>
              <SettingsRow actionTo="/settings/billing/plans" actionLabel="Сменить" label="">
                <div>
                  <div className="settings-row__label">
                    {billing.planName}{' '}
                    <StatusBadge variant="success" className="ml-2 align-middle">
                      Активна
                    </StatusBadge>
                  </div>
                  <div className="settings-row__hint">
                    {billing.planPrice} · {billing.planFeatures}
                    {billing.billingInterval === 'yearly' ? ' · годовая оплата' : ' · помесячно'}
                  </div>
                </div>
              </SettingsRow>
            </SettingsGroup>
          </DocBlock>

          <DocBlock>
            <DocBlockHead
              title="Оплата"
              actions={
                <Link to="/settings/billing/payment">
                  <Button variant="ghost" size="sm" type="button">
                    Изменить
                  </Button>
                </Link>
              }
            />
            <SettingsGroup>
              <SettingsRow label="" hint="">
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="settings-row__label">
                      {billing.paymentMethod ?? 'Не подключено'}
                    </div>
                    {billing.paymentHint ? (
                      <div className="settings-row__hint">{billing.paymentHint}</div>
                    ) : null}
                  </div>
                  {billing.paymentMethod ? (
                    <StatusBadge variant="success">По умолчанию</StatusBadge>
                  ) : (
                    <StatusBadge variant="muted">Не подключено</StatusBadge>
                  )}
                </div>
              </SettingsRow>
              {billing.legalEntity ? (
                <SettingsRow label={billing.legalEntity} hint={billing.legalHint} />
              ) : null}
            </SettingsGroup>
          </DocBlock>

          <DocBlock>
            <DocBlockHead
              title="AI-инсайты"
              hint="· этот месяц"
              actions={
                <Button
                  size="sm"
                  type="button"
                  disabled={!canWrite}
                  onClick={() => setCreditPackOpen(true)}
                >
                  <Zap className="size-3.5" />
                  Купить пакет
                </Button>
              }
            />
            <div className="credits-bar">
              <div className="credits-bar__fill" style={{ width: `${creditsPct}%` }} />
            </div>
            <p className="m-0 text-sm text-muted-foreground">
              {billing.creditsUsed} из {billing.creditsTotal} кредитов
              {billing.creditsBonus ? ` (включая ${billing.creditsBonus} бонусных)` : ''} · сброс{' '}
              {billing.creditsResetAt}. LLM-генерация = 1 кредит, простые алерты — бесплатно.
            </p>
          </DocBlock>

          {billing.planId === 'enterprise' ? (
            <DocBlock title="Enterprise">
              <SettingsGroup>
                <SettingsRow
                  label="Свой LLM (BYOK)"
                  hint="BYOK для compliance — отключает квоту платформы"
                  actionTo="/settings/enterprise/llm"
                  actionLabel="Настроить"
                />
              </SettingsGroup>
            </DocBlock>
          ) : null}

          <DocBlock>
            <DocBlockHead
              title="Счета"
              actions={
                <Link to="/settings/billing/invoices">
                  <Button variant="ghost" size="sm" type="button">
                    Все счета
                  </Button>
                </Link>
              }
            />
            {billing.invoices.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Счетов пока нет — появятся после подключения оплаты.
              </p>
            ) : (
              <DataTable>
                <DataTableHead>
                  <DataTableTh>Дата</DataTableTh>
                  <DataTableTh>Описание</DataTableTh>
                  <DataTableTh className="w-[120px]">Сумма</DataTableTh>
                  <DataTableTh className="w-[120px]">Статус</DataTableTh>
                </DataTableHead>
                <DataTableBody>
                  {billing.invoices.map((invoice) => (
                    <DataTableRow key={invoice.date + invoice.description}>
                      <DataTableTd>{invoice.date}</DataTableTd>
                      <DataTableTd>{invoice.description}</DataTableTd>
                      <DataTableTd className="tabular-nums">{invoice.amount}</DataTableTd>
                      <DataTableTd>
                        <StatusBadge
                          variant={
                            invoice.status === 'paid'
                              ? 'success'
                              : invoice.status === 'pending'
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {invoice.status === 'paid'
                            ? 'Оплачен'
                            : invoice.status === 'pending'
                              ? 'Ожидает'
                              : 'Ошибка'}
                        </StatusBadge>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </DocBlock>
        </>
      ) : null}

      <CreditPackDialog open={creditPackOpen} onClose={() => setCreditPackOpen(false)} />
    </DocPage>
  );
}
