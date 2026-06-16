import type { AuditFilter } from '@umetrica/core';
import { Loader2, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuditEvents, downloadAuditCsv } from '@/hooks/use-enterprise';
import { useBilling } from '@/hooks/use-billing';
import { useMe } from '@/hooks/use-me';
import { cn } from '@/lib/utils';

const FILTERS: { id: AuditFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'semantics', label: 'Семантика' },
  { id: 'team', label: 'Команда' },
];

export function SettingsAuditPage() {
  const { data: me } = useMe();
  const { data: billing } = useBilling();
  const [filter, setFilter] = useState<AuditFilter>('all');
  const { data, isLoading, error } = useAuditEvents(filter);
  const [exporting, setExporting] = useState(false);

  const isEnterprise = billing?.planId === 'enterprise';

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAuditCsv();
    } finally {
      setExporting(false);
    }
  };

  return (
    <DocPage
      title="Audit log"
      lead={`Enterprise · действия в ${me?.organization?.name ?? 'компании'}`}
      icon={ScrollText}
      back={{ to: '/settings/company', label: 'Компания' }}
      mobileTitle="Audit log"
      mobileSubtitle={me?.organization?.name}
    >
      {!isEnterprise && billing ? (
        <Card className="mb-4">
          <CardContent className="p-3 text-[13px] text-muted-foreground">
            Audit log доступен на тарифе Enterprise.{' '}
            <Link to="/settings/billing/plans" className="text-primary hover:underline">
              Сменить тариф →
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {isEnterprise ? (
        <DocBlock>
          <DataTable
            toolbar={
              <div className="db-toolbar">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn('db-view', filter === item.id && 'is-active')}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
                <span className="db-toolbar__spacer" />
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  disabled={exporting}
                  onClick={() => void handleExport()}
                >
                  {exporting ? 'Экспорт...' : 'Экспорт CSV'}
                </Button>
              </div>
            }
          >
            <DataTableHead>
              <DataTableRow>
                <DataTableTh>Дата</DataTableTh>
                <DataTableTh>Актор</DataTableTh>
                <DataTableTh>Действие</DataTableTh>
                <DataTableTh>Объект</DataTableTh>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {data?.items.map((event) => (
                <DataTableRow key={event.id}>
                  <DataTableTd className="tabular-nums">{event.date}</DataTableTd>
                  <DataTableTd>{event.actorName}</DataTableTd>
                  <DataTableTd>{event.action}</DataTableTd>
                  <DataTableTd>{event.objectLabel}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>

          {isLoading ? (
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Загрузка...
            </p>
          ) : null}

          {!isLoading && error ? (
            <p className="mt-3 text-xs text-destructive">
              {error instanceof Error ? error.message : 'Ошибка загрузки'}
            </p>
          ) : null}

          {!isLoading && !error && (data?.items.length ?? 0) === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">Событий пока нет</p>
          ) : null}
        </DocBlock>
      ) : null}
    </DocPage>
  );
}
