import { buildWidgetQuery, type Widget } from '@umetrica/core';
import type { Query } from '@cubejs-client/core';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useMemo } from 'react';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import { useCubeQuery } from '@cubejs-client/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

const PIE_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

function formatValue(value: number, measureKey: string) {
  if (measureKey.toLowerCase().includes('revenue') || measureKey.toLowerCase().includes('amount')) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  }

  return value.toLocaleString('ru-RU');
}

function getDimensionKey(widget: Widget) {
  return (
    widget.dimensions.find((dimension) => dimension === widget.timeDimension) ??
    widget.dimensions[0] ??
    ''
  );
}

function getDimensionLabel(widget: Widget, dimensionKey: string, raw: unknown) {
  if (dimensionKey === widget.timeDimension && raw) {
    return new Date(String(raw)).toLocaleDateString('ru-RU');
  }
  return String(raw ?? '—');
}

function KpiWidget({ widget }: { widget: Widget }) {
  const query = buildWidgetQuery(widget) as Query | null;
  const { isLoading, error, resultSet } = useCubeQuery(query ?? { measures: [] }, { skip: !query });

  const measureKey = widget.measures[0] ?? '';
  const rows = resultSet?.tablePivot() ?? [];
  const value = Number(rows[0]?.[measureKey] ?? 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {isLoading ? '...' : error ? '—' : formatValue(value, measureKey)}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartWidget({ widget }: { widget: Widget }) {
  const query = buildWidgetQuery(widget) as Query | null;
  const { isLoading, error, resultSet } = useCubeQuery(query ?? { measures: [] }, { skip: !query });

  const chartData = useMemo(() => {
    if (!resultSet || widget.dimensions.length === 0) return null;

    const rows = resultSet.tablePivot();
    const dimensionKey = getDimensionKey(widget);
    const measureKey = widget.measures[0]!;

    return {
      labels: rows.map((row) => getDimensionLabel(widget, dimensionKey, row[dimensionKey])),
      datasets: [
        {
          label: widget.title,
          data: rows.map((row) => Number(row[measureKey] ?? 0)),
          backgroundColor: widget.chartType === 'line' ? 'rgba(59, 130, 246, 0.2)' : '#3b82f6',
          borderColor: '#3b82f6',
          borderWidth: 2,
          tension: 0.3,
          fill: widget.chartType === 'area',
        },
      ],
    };
  }, [resultSet, widget]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#334155' },
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { display: false },
        },
      },
    }),
    []
  );

  const ChartComponent = widget.chartType === 'line' || widget.chartType === 'area' ? Line : Bar;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        {isLoading && <div className="text-sm text-muted-foreground">Загрузка...</div>}
        {error && <div className="text-sm text-insight-warning">Ошибка загрузки</div>}
        {!isLoading && !error && chartData && (
          <div className="h-full min-h-[180px]">
            <ChartComponent data={chartData} options={options} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PieWidget({ widget }: { widget: Widget }) {
  const query = buildWidgetQuery(widget) as Query | null;
  const { isLoading, error, resultSet } = useCubeQuery(query ?? { measures: [] }, { skip: !query });
  const isDonut = widget.chartType === 'donut';

  const chartData = useMemo(() => {
    if (!resultSet || widget.dimensions.length === 0) return null;

    const rows = resultSet.tablePivot();
    const dimensionKey = getDimensionKey(widget);
    const measureKey = widget.measures[0]!;

    return {
      labels: rows.map((row) => getDimensionLabel(widget, dimensionKey, row[dimensionKey])),
      datasets: [
        {
          data: rows.map((row) => Number(row[measureKey] ?? 0)),
          backgroundColor: rows.map((_, index) => PIE_COLORS[index % PIE_COLORS.length]),
          borderColor: '#1e293b',
          borderWidth: 1,
        },
      ],
    };
  }, [resultSet, widget]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right' as const,
          labels: { color: '#94a3b8', boxWidth: 12 },
        },
      },
      cutout: isDonut ? '55%' : undefined,
    }),
    [isDonut]
  );

  const ChartComponent = isDonut ? Doughnut : Pie;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        {isLoading && <div className="text-sm text-muted-foreground">Загрузка...</div>}
        {error && <div className="text-sm text-insight-warning">Ошибка загрузки</div>}
        {!isLoading && !error && chartData && (
          <div className="h-full min-h-[180px]">
            <ChartComponent data={chartData} options={options} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WidgetRenderer({ widget }: { widget: Widget }) {
  if (widget.chartType === 'kpi') {
    return <KpiWidget widget={widget} />;
  }

  if (['bar', 'line', 'area'].includes(widget.chartType)) {
    return <ChartWidget widget={widget} />;
  }

  if (['pie', 'donut'].includes(widget.chartType)) {
    return <PieWidget widget={widget} />;
  }

  return (
    <Card className="h-full">
      <CardContent className="pt-6 text-sm text-muted-foreground">
        Тип «{widget.chartType}» пока не поддерживается
      </CardContent>
    </Card>
  );
}
