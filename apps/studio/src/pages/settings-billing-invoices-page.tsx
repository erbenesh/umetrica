import { FileText, Loader2 } from 'lucide-react';

import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from '@/components/doc/data-table';
import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { StatusBadge } from '@/components/doc/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { useBillingInvoices } from '@/hooks/use-billing';
import { useMe } from '@/hooks/use-me';

function invoiceStatusVariant(status: 'paid' | 'pending' | 'failed') {
  if (status === 'paid') return 'success' as const;
  if (status === 'pending') return 'warning' as const;
  return 'danger' as const;
}

function invoiceStatusLabel(status: 'paid' | 'pending' | 'failed') {
  if (status === 'paid') return 'Оплачен';
  if (status === 'pending') return 'Ожидает';
  return 'Ошибка';
}

export function SettingsBillingInvoicesPage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useBillingInvoices();

  return (
    <DocPage
      title="Счета"
      lead="История платежей и подписок"
      icon={FileText}
      back={{ to: '/settings/billing', label: 'Биллинг' }}
      mobileTitle="Счета"
      mobileSubtitle={me?.organization?.name}
    >
      <DocBlock>
        {isLoading ? (
          <Card className="border-border">
            <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Загрузка счетов...
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-border">
            <CardContent className="p-3 text-xs text-destructive">
              {error instanceof Error ? error.message : 'Ошибка загрузки'}
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !error && (data?.items.length ?? 0) === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Счетов пока нет — появятся после первой оплаты подписки.
          </p>
        ) : null}

        {data && data.items.length > 0 ? (
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>Дата</DataTableTh>
                <DataTableTh>Описание</DataTableTh>
                <DataTableTh className="w-[120px]">Сумма</DataTableTh>
                <DataTableTh className="w-[120px]">Статус</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {data.items.map((invoice) => (
                <DataTableRow key={invoice.date + invoice.description + invoice.amount}>
                  <DataTableTd>{invoice.date}</DataTableTd>
                  <DataTableTd>{invoice.description}</DataTableTd>
                  <DataTableTd className="tabular-nums">{invoice.amount}</DataTableTd>
                  <DataTableTd>
                    <StatusBadge variant={invoiceStatusVariant(invoice.status)}>
                      {invoiceStatusLabel(invoice.status)}
                    </StatusBadge>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </DocBlock>
    </DocPage>
  );
}
