import type { Query } from '@cubejs-client/core';
import { useCubeQuery } from '@cubejs-client/react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

interface MetricKpiProps {
  query: Query;
  title: string;
  description?: string;
  measureKey: string;
  format?: 'currency' | 'number';
}

export function MetricKpi({
  query,
  title,
  description,
  measureKey,
  format = 'currency',
}: MetricKpiProps) {
  const { isLoading, error, resultSet } = useCubeQuery(query);

  const rows = resultSet?.tablePivot() ?? [];
  const rawValue = rows[0]?.[measureKey];
  const value = Number(rawValue ?? 0);

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tabular-nums">
          {isLoading
            ? '...'
            : error
              ? '—'
              : format === 'currency'
                ? formatCurrency(value)
                : value.toLocaleString('ru-RU')}
        </CardTitle>
      </CardHeader>
      {description && <CardContent className="text-xs text-muted-foreground">{description}</CardContent>}
      {error && (
        <CardContent className="text-xs text-insight-warning">Ошибка загрузки метрики</CardContent>
      )}
    </Card>
  );
}
