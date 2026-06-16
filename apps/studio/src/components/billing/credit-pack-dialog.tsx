import type { CreditPack, CreditPackId } from '@sellerpool/core';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SettingsGroup } from '@/components/doc/settings-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBilling, useBillingPayment, useCreditPackCheckout, useCreditPacks } from '@/hooks/use-billing';
import { cn } from '@/lib/utils';

interface CreditPackDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreditPackDialog({ open, onClose }: CreditPackDialogProps) {
  const { data: billing } = useBilling();
  const { data: payment } = useBillingPayment();
  const { data: packsData, isLoading } = useCreditPacks();
  const checkout = useCreditPackCheckout();

  const [selectedPackId, setSelectedPackId] = useState<CreditPackId>('pack_50');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedPackId('pack_50');
  }, [open]);

  if (!open) return null;

  const packs = packsData?.packs ?? [];
  const selectedPack = packs.find((pack) => pack.id === selectedPackId) ?? packs[0];

  const handlePay = async () => {
    if (!selectedPack) return;

    setError(null);

    try {
      const result = await checkout.mutateAsync({ packId: selectedPack.id });
      if (result.status === 'redirect' && result.confirmationUrl) {
        window.location.href = result.confirmationUrl;
        return;
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось оплатить');
    }
  };

  const paymentLabel = payment?.paymentMethod
    ? `${payment.paymentMethod.brand} ·••• ${payment.paymentMethod.last4}`
    : 'Не подключено';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <Card className="w-full max-w-md rounded-b-none sm:rounded-b-lg">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <CardHeader className="pb-2">
          <CardTitle>Купить AI-кредиты</CardTitle>
          <p className="m-0 text-[13px] text-muted-foreground">
            Дополнение к месячной квоте тарифа {billing?.planName ?? '—'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {billing ? (
            <p className="m-0 text-sm text-muted-foreground">
              Сейчас:{' '}
              <strong className="text-foreground">
                {billing.creditsUsed} / {billing.creditsTotal}
              </strong>
              {billing.creditsBonus ? (
                <span> · включая {billing.creditsBonus} бонусных</span>
              ) : null}
              {' · '}сброс {billing.creditsResetAt}
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Загрузка пакетов...
            </div>
          ) : (
            <SettingsGroup>
              {packs.map((pack: CreditPack) => (
                <label
                  key={pack.id}
                  className={cn(
                    'settings-row cursor-pointer',
                    selectedPackId === pack.id && 'bg-muted/50'
                  )}
                >
                  <div>
                    <div className="settings-row__label">+{pack.credits} кредитов</div>
                    <div className="settings-row__hint">
                      {pack.priceLabel} · {pack.hint}
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="pack"
                    checked={selectedPackId === pack.id}
                    onChange={() => setSelectedPackId(pack.id)}
                  />
                </label>
              ))}
            </SettingsGroup>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <div>
              <div className="settings-row__label">{paymentLabel}</div>
              <div className="settings-row__hint">Списание сразу после подтверждения</div>
            </div>
            <Link to="/settings/billing/payment">
              <Button variant="ghost" size="sm" type="button" onClick={onClose}>
                Изменить
              </Button>
            </Link>
          </div>

          {error ? <p className="m-0 text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="button"
              disabled={!selectedPack || checkout.isPending}
              onClick={() => void handlePay()}
            >
              {checkout.isPending
                ? 'Оплата...'
                : `Оплатить ${selectedPack?.priceLabel ?? ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
