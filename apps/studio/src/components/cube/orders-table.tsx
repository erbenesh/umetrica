import { useCubeQuery } from '@cubejs-client/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ORDERS_TABLE_QUERY = {
  measures: ['Orders.count', 'Orders.revenue', 'Orders.avgOrder'],
  dimensions: ['Orders.status'],
  order: {
    'Orders.revenue': 'desc' as const,
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function OrdersCubeTable() {
  const { isLoading, error, resultSet } = useCubeQuery(ORDERS_TABLE_QUERY);

  const rows = resultSet?.tablePivot() ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Заказы по статусам</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}
        {error && <p className="text-sm text-insight-warning">Ошибка загрузки таблицы</p>}
        {!isLoading && !error && (
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Статус</th>
                <th className="py-2 pr-4 font-medium">Заказы</th>
                <th className="py-2 pr-4 font-medium">Выручка</th>
                <th className="py-2 font-medium">Средний чек</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = String(row['Orders.status'] ?? '—');
                const count = Number(row['Orders.count'] ?? 0);
                const revenue = Number(row['Orders.revenue'] ?? 0);
                const avgOrder = Number(row['Orders.avgOrder'] ?? 0);

                return (
                  <tr key={status} className="border-b border-border/60">
                    <td className="py-3 pr-4">{status}</td>
                    <td className="py-3 pr-4">{count}</td>
                    <td className="py-3 pr-4">{formatCurrency(revenue)}</td>
                    <td className="py-3">{formatCurrency(avgOrder)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
