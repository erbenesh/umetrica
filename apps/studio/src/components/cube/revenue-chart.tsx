import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useCubeQuery } from '@cubejs-client/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const REVENUE_BY_STATUS_QUERY = {
  measures: ['Orders.revenue'],
  dimensions: ['Orders.status'],
  order: {
    'Orders.revenue': 'desc' as const,
  },
};

export function RevenueByStatusChart() {
  const { isLoading, error, resultSet } = useCubeQuery(REVENUE_BY_STATUS_QUERY);

  const chartData = useMemo(() => {
    if (!resultSet) return null;

    const rows = resultSet.tablePivot();
    const labels = rows.map(
      (row) => String(row['Orders.status'] ?? row['Orders.status,none'] ?? '—')
    );
    const values = rows.map((row) =>
      Number(row['Orders.revenue'] ?? row['Orders.revenue,none'] ?? 0)
    );

    return {
      labels,
      datasets: [
        {
          label: 'Выручка',
          data: values,
          backgroundColor: ['#3b82f6', '#38bdf8', '#f97316'],
          borderRadius: 8,
        },
      ],
    };
  }, [resultSet]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          ticks: {
            color: '#94a3b8',
          },
          grid: {
            color: '#334155',
          },
        },
        x: {
          ticks: {
            color: '#94a3b8',
          },
          grid: {
            display: false,
          },
        },
      },
    }),
    []
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Выручка по статусам</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-64 text-sm text-muted-foreground">Загрузка...</div>}
        {error && (
          <div className="h-64 text-sm text-insight-warning">
            Не удалось загрузить график из Cube.js
          </div>
        )}
        {!isLoading && !error && chartData && (
          <div className="h-64">
            <Bar data={chartData} options={options} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
