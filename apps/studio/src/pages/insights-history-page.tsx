import type { InsightRun } from '@umetrica/core';
import { History, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  DataCell,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from '@/components/doc/data-table';
import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { Card, CardContent } from '@/components/ui/card';
import { useInsightHistory } from '@/hooks/use-insights';
import {
  formatInsightRunDate,
  formatMonthCredits,
  insightRunResultLabel,
  insightRunTypeLabel,
} from '@/lib/insight-format';

function insightRunHref(run: InsightRun) {
  if (run.result !== 'insights' || !run.firstInsightId) return undefined;
  if (run.insightCount === 1) return `/insights/${run.firstInsightId}`;
  return '/insights';
}

export function InsightsHistoryPage() {
  const { data, isLoading, error } = useInsightHistory();

  const monthLabel = data ? formatMonthCredits(data.monthCredits) : '—';

  return (
    <DocPage
      title="История прогонов"
      lead="Списание AI-кредитов и результаты проверок"
      icon={History}
      back="auto"
      mobileTitle="История"
      props={[
        { label: 'Период', value: monthLabel },
        { label: 'Инсайтов', value: data ? String(data.monthInsights) : '—' },
      ]}
    >
      {isLoading ? (
        <Card className="mb-4">
          <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Загрузка истории...
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
        {!isLoading && !error && data?.items.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Пока нет прогонов. Нажмите «Проверить» на странице инсайтов — здесь появится запись о
            списании кредитов.
          </p>
        ) : null}

        {data && data.items.length > 0 ? (
          <DataTable>
            <DataTableHead>
              <DataTableTh>Дата</DataTableTh>
              <DataTableTh>Тип</DataTableTh>
              <DataTableTh>Результат</DataTableTh>
              <DataTableTh className="w-[80px]">Кредиты</DataTableTh>
            </DataTableHead>
            <DataTableBody>
              {data.items.map((row) => {
                const href = insightRunHref(row);
                const resultLabel = insightRunResultLabel(row);

                return (
                  <DataTableRow key={row.id}>
                    <DataTableTd>
                      <div className="tabular-nums text-muted-foreground">
                        {formatInsightRunDate(row.createdAt)}
                      </div>
                    </DataTableTd>
                    <DataTableTd>
                      <DataCell title={insightRunTypeLabel(row)} />
                    </DataTableTd>
                    <DataTableTd>
                      {href ? (
                        <Link to={href} className="font-medium text-primary hover:underline">
                          {resultLabel}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{resultLabel}</span>
                      )}
                    </DataTableTd>
                    <DataTableTd>
                      <div className="tabular-nums">{row.creditsUsed}</div>
                    </DataTableTd>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        ) : null}
      </DocBlock>
    </DocPage>
  );
}
