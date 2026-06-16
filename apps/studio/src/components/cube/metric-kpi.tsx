import type { Query } from '@cubejs-client/core';
import { useCubeQuery } from '@cubejs-client/react';
import type { ReactNode } from 'react';

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

  const display = isLoading
    ? '…'
    : error
      ? '—'
      : format === 'currency'
        ? formatCurrency(value)
        : value.toLocaleString('ru-RU');

  return (
    <div className="stat-strip__item">
      <p className="stat-strip__label">{title}</p>
      <p className="stat-strip__value">{display}</p>
      {description ? <p className="stat-strip__note">{description}</p> : null}
      {error ? <p className="stat-strip__note text-insight-warning">Ошибка загрузки</p> : null}
    </div>
  );
}

export function StatStrip({ children }: { children: ReactNode }) {
  return <div className="stat-strip">{children}</div>;
}
