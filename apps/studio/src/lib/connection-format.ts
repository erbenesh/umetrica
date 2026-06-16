import type { Connection } from '@umetrica/core';

const PROVIDER_LABELS: Record<string, string> = {
  wildberries: 'Wildberries',
  ozon: 'Ozon',
  yandex_market: 'Яндекс Маркет',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  bigquery: 'BigQuery',
  clickhouse: 'ClickHouse',
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  sales: 'Продажи по артикулам',
  orders: 'Заказы',
  stock: 'Остатки',
};

export function connectionProviderLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function connectionMethodLabel(connection: Connection) {
  if (connection.method === 'csv') return 'CSV · ручная загрузка';
  if (connection.method === 'api') return 'API · автообновление';
  return 'JDBC';
}

export function connectionStatusLabel(status: Connection['status']) {
  const labels: Record<Connection['status'], string> = {
    active: 'Активно',
    pending: 'Ожидание',
    error: 'Ошибка',
    disconnected: 'Отключено',
  };
  return labels[status];
}

export function connectionStatusVariant(status: Connection['status']) {
  if (status === 'active') return 'success' as const;
  if (status === 'error') return 'warning' as const;
  return 'muted' as const;
}

export function formatConnectionUpdatedAt(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function connectionCabinetLabel(items: Connection[]) {
  const csv = items.find((item) => item.kind === 'csv' || (item.kind === 'marketplace' && item.method === 'csv'));
  const api = items.find((item) => item.method === 'api' && item.kind === 'marketplace');

  if (api) return `API · ${formatConnectionUpdatedAt(api.lastSyncAt)}`;
  if (csv) return `CSV · ${formatConnectionUpdatedAt(csv.lastSyncAt)}`;
  return 'не загружен';
}

export function connectionHomeLead(items: Connection[]) {
  const csv = items.find((item) => item.kind === 'csv');
  const api = items.find((item) => item.method === 'api' && item.kind === 'marketplace');
  const source = csv ?? api;

  if (!source) return 'Продажи за последние 30 дней · данные из Cube.js';

  const provider = connectionProviderLabel(source.provider);
  const method = source.method === 'api' ? 'API' : 'CSV';
  return `Продажи за 30 дней · ${provider} ${method} от ${formatConnectionUpdatedAt(source.lastSyncAt)}`;
}

export function connectionDocProps(items: Connection[]) {
  const csv = items.find((item) => item.kind === 'csv' || (item.kind === 'marketplace' && item.method === 'csv'));
  const api = items.find((item) => item.method === 'api');
  const category = items.find((item) => item.config.category)?.config.category;

  return [
    {
      label: 'WB',
      value: csv ? `CSV · ${formatConnectionUpdatedAt(csv.lastSyncAt)}` : 'не загружен',
    },
    {
      label: 'API',
      value: api ? 'подключён' : 'не подключён',
    },
    {
      label: 'Категория',
      value: category ?? '—',
    },
  ];
}

export function reportTypeLabel(reportType?: string) {
  if (!reportType) return '—';
  return REPORT_TYPE_LABELS[reportType] ?? reportType;
}

export function marketplaceConnections(items: Connection[]) {
  return items.filter((item) => item.kind === 'marketplace' || item.kind === 'csv');
}

export function databaseConnections(items: Connection[]) {
  return items.filter((item) => item.kind === 'database');
}
