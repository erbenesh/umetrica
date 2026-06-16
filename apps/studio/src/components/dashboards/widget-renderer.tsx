import { buildWidgetQuery, type Widget } from '@sellerpool/core';
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
  '#2383e2',
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

function WidgetShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="canvas-cell">
      <p className="kpi__label">{title}</p>
      {children}
    </div>
  );
}

function KpiWidget({ widget }: { widget: Widget }) {
  const query = buildWidgetQuery(widget) as Query | null;
  const { isLoading, error, resultSet } = useCubeQuery(query ?? { measures: [] }, { skip: !query });

  const measureKey = widget.measures[0] ?? '';
  const rows = resultSet?.tablePivot() ?? [];
  const value = Number(rows[0]?.[measureKey] ?? 0);

  return (
    <WidgetShell title={widget.title}>
      <p className="kpi__value">
        {isLoading ? '…' : error ? '—' : formatValue(value, measureKey)}
      </p>
    </WidgetShell>
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
          backgroundColor: widget.chartType === 'line' ? 'rgba(35, 131, 226, 0.2)' : '#2383e2',
          borderColor: '#2383e2',
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
          ticks: { color: '#9b9a97', font: { size: 11 } },
          grid: { color: 'rgba(55, 53, 47, 0.09)' },
          border: { display: false },
        },
        x: {
          ticks: { color: '#9b9a97', font: { size: 11 } },
          grid: { display: false },
          border: { display: false },
        },
      },
    }),
    []
  );

  const ChartComponent = widget.chartType === 'line' || widget.chartType === 'area' ? Line : Bar;

  return (
    <WidgetShell title={widget.title}>
      <div className="kpi__chart">
        {isLoading && <div className="text-sm text-muted-foreground">Загрузка...</div>}
        {error && <div className="text-sm text-insight-warning">Ошибка загрузки</div>}
        {!isLoading && !error && chartData && (
          <div className="h-full min-h-[140px]">
            <ChartComponent data={chartData} options={options} />
          </div>
        )}
      </div>
    </WidgetShell>
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
          borderColor: 'transparent',
          borderWidth: 0,
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
          labels: { color: '#9b9a97', boxWidth: 12, font: { size: 11 } },
        },
      },
      cutout: isDonut ? '55%' : undefined,
    }),
    [isDonut]
  );

  const ChartComponent = isDonut ? Doughnut : Pie;

  return (
    <WidgetShell title={widget.title}>
      <div className="kpi__chart">
        {isLoading && <div className="text-sm text-muted-foreground">Загрузка...</div>}
        {error && <div className="text-sm text-insight-warning">Ошибка загрузки</div>}
        {!isLoading && !error && chartData && (
          <div className="h-full min-h-[140px]">
            <ChartComponent data={chartData} options={options} />
          </div>
        )}
      </div>
    </WidgetShell>
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
    <WidgetShell title={widget.title}>
      <p className="text-sm text-muted-foreground">Тип «{widget.chartType}» пока не поддерживается</p>
    </WidgetShell>
  );
}
