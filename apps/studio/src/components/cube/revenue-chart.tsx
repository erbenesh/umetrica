import { useMemo } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useCubeQuery } from '@cubejs-client/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/components/theme-provider';
import { readCssVar } from '@/lib/theme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const REVENUE_BY_STATUS_QUERY = {
  measures: ['Orders.revenue'],
  dimensions: ['Orders.status'],
  order: {
    'Orders.revenue': 'desc' as const,
  },
};

export function RevenueByStatusChart() {
  const { theme } = useTheme();
  const { isLoading, error, resultSet } = useCubeQuery(REVENUE_BY_STATUS_QUERY);

  const chartData = useMemo(() => {
    void theme;

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
          backgroundColor: [
            readCssVar('--chart-1'),
            readCssVar('--chart-2'),
            readCssVar('--chart-3'),
          ],
          borderRadius: 4,
        },
      ],
    };
  }, [resultSet, theme]);

  const options = useMemo(
    () => {
      void theme;

      return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          ticks: {
            color: readCssVar('--chart-tick'),
            font: { size: 11 },
          },
          grid: {
            color: readCssVar('--chart-grid'),
          },
        },
        x: {
          ticks: {
            color: readCssVar('--chart-tick'),
            font: { size: 11 },
          },
          grid: {
            display: false,
          },
        },
      },
    };
    },
    [theme]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Выручка по статусам</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-52 text-xs text-muted-foreground">Загрузка...</div>}
        {error && (
          <div className="h-52 text-xs text-insight-warning">
            Не удалось загрузить график из Cube.js
          </div>
        )}
        {!isLoading && !error && chartData && (
          <div className="h-52">
            <Bar data={chartData} options={options} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
