import type { ChartType, DateRangePreset, TimeGranularity, Widget } from '@umetrica/core';
import { useCubeMeta } from '@cubejs-client/react';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { nextWidgetLayout } from '@/lib/widget-layout';
import { cn } from '@/lib/utils';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'kpi', label: 'KPI' },
  { value: 'bar', label: 'Столбцы' },
  { value: 'line', label: 'Линия' },
  { value: 'area', label: 'Область' },
  { value: 'pie', label: 'Круговая' },
  { value: 'donut', label: 'Кольцевая' },
];

const DATE_RANGES: { value: DateRangePreset; label: string }[] = [
  { value: 'last 7 days', label: '7 дней' },
  { value: 'last 30 days', label: '30 дней' },
  { value: 'last 90 days', label: '90 дней' },
  { value: 'this month', label: 'Этот месяц' },
  { value: 'last month', label: 'Прошлый месяц' },
];

const GRANULARITIES: { value: TimeGranularity; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

const FILTER_OPERATORS = [
  { value: 'equals', label: 'равно' },
  { value: 'notEquals', label: 'не равно' },
  { value: 'contains', label: 'содержит' },
];

interface FilterRow {
  member: string;
  operator: string;
  values: string;
}

interface WidgetEditorDialogProps {
  open: boolean;
  widgets: Widget[];
  initial?: Widget | null;
  onClose: () => void;
  onSave: (widget: Widget) => Promise<void>;
  isSubmitting?: boolean;
}

function parseFilterValues(raw: string): string | string[] {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return trimmed;
}

function filtersToRows(filters: Widget['filters']): FilterRow[] {
  return (filters ?? []).map((filter) => ({
    member: filter.member ?? '',
    operator: filter.operator ?? 'equals',
    values: Array.isArray(filter.values)
      ? filter.values.join(', ')
      : filter.values !== undefined
        ? String(filter.values)
        : '',
  }));
}

export function WidgetEditorDialog({
  open,
  widgets,
  initial,
  onClose,
  onSave,
  isSubmitting,
}: WidgetEditorDialogProps) {
  const { response, isLoading } = useCubeMeta();
  const cubes = useMemo(() => response?.cubes ?? [], [response?.cubes]);
  const regularCubes = useMemo(() => cubes.filter((cube) => cube.type !== 'view'), [cubes]);
  const viewCubes = useMemo(() => cubes.filter((cube) => cube.type === 'view'), [cubes]);

  const [title, setTitle] = useState('');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [cubeName, setCubeName] = useState('Orders');
  const [measures, setMeasures] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [timeDimension, setTimeDimension] = useState('');
  const [dateRange, setDateRange] = useState<DateRangePreset>('last 30 days');
  const [granularity, setGranularity] = useState<TimeGranularity>('day');
  const [filterRows, setFilterRows] = useState<FilterRow[]>([]);

  const selectedCube = useMemo(
    () => cubes.find((cube) => cube.name === cubeName),
    [cubes, cubeName]
  );

  const availableMeasures = selectedCube?.measures ?? [];
  const availableDimensions = useMemo(
    () => selectedCube?.dimensions ?? [],
    [selectedCube?.dimensions]
  );
  const timeDimensions = useMemo(
    () => availableDimensions.filter((dimension) => dimension.type === 'time'),
    [availableDimensions]
  );

  const defaultTimeDimension = timeDimensions[0]?.name ?? '';

  useEffect(() => {
    if (!open) return;

    if (initial) {
      setTitle(initial.title);
      setChartType(initial.chartType);
      setCubeName(initial.cubeName);
      setMeasures(initial.measures);
      setDimensions(initial.dimensions);
      setTimeDimension(initial.timeDimension ?? defaultTimeDimension);
      setDateRange(initial.dateRange ?? 'last 30 days');
      setGranularity(initial.granularity ?? 'day');
      setFilterRows(filtersToRows(initial.filters));
      return;
    }

    setTitle('');
    setChartType('bar');
    setCubeName(cubes[0]?.name ?? 'Orders');
    setMeasures([]);
    setDimensions([]);
    setTimeDimension(defaultTimeDimension);
    setDateRange('last 30 days');
    setGranularity('day');
    setFilterRows([]);
  }, [open, initial, cubes, defaultTimeDimension]);

  const toggleItem = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const addFilterRow = () => {
    setFilterRows((rows) => [
      ...rows,
      { member: availableDimensions[0]?.name ?? '', operator: 'equals', values: '' },
    ]);
  };

  const updateFilterRow = (index: number, patch: Partial<FilterRow>) => {
    setFilterRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeFilterRow = (index: number) => {
    setFilterRows((rows) => rows.filter((_, i) => i !== index));
  };

  const usesTimeDimension = dimensions.includes(timeDimension);

  const handleSubmit = async () => {
    if (!title.trim() || measures.length === 0) return;
    if (chartType !== 'kpi' && dimensions.length === 0) return;

    const filters = filterRows
      .filter((row) => row.member && row.operator && row.values.trim())
      .map((row) => ({
        member: row.member,
        operator: row.operator,
        values: parseFilterValues(row.values),
      }));

    const widget: Widget = {
      id: initial?.id ?? crypto.randomUUID(),
      cubeName,
      chartType,
      title: title.trim(),
      measures,
      dimensions: chartType === 'kpi' ? [] : dimensions,
      filters,
      ...(timeDimension && dateRange
        ? {
            timeDimension,
            dateRange,
            ...(usesTimeDimension ? { granularity } : {}),
          }
        : {}),
      layout: initial?.layout ?? nextWidgetLayout(widgets, chartType),
    };

    await onSave(widget);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <CardHeader>
          <CardTitle>{initial ? 'Редактировать виджет' : 'Новый виджет'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm text-muted-foreground">
              Тип графика
              <select
                className="mt-1 flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
              >
                {CHART_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-muted-foreground">
              Источник данных
              <select
                className="mt-1 flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                value={cubeName}
                onChange={(e) => {
                  setCubeName(e.target.value);
                  setMeasures([]);
                  setDimensions([]);
                  setFilterRows([]);
                }}
                disabled={isLoading}
              >
                {regularCubes.length > 0 ? (
                  <optgroup label="Кубы">
                    {regularCubes.map((cube) => (
                      <option key={cube.name} value={cube.name}>
                        {cube.title ?? cube.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {viewCubes.length > 0 ? (
                  <optgroup label="Views">
                    {viewCubes.map((cube) => (
                      <option key={cube.name} value={cube.name}>
                        {cube.title ?? cube.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {regularCubes.length === 0 && viewCubes.length === 0
                  ? cubes.map((cube) => (
                      <option key={cube.name} value={cube.name}>
                        {cube.title ?? cube.name}
                      </option>
                    ))
                  : null}
              </select>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm text-muted-foreground">
              Период
              <select
                className="mt-1 flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
              >
                {DATE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-muted-foreground">
              Поле даты
              <select
                className="mt-1 flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                value={timeDimension}
                onChange={(e) => setTimeDimension(e.target.value)}
                disabled={timeDimensions.length === 0}
              >
                {timeDimensions.length === 0 ? (
                  <option value="">Нет time-полей</option>
                ) : (
                  timeDimensions.map((dimension) => (
                    <option key={dimension.name} value={dimension.name}>
                      {dimension.shortTitle ?? dimension.title ?? dimension.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            {usesTimeDimension && (
              <label className="text-sm text-muted-foreground">
                Гранулярность
                <select
                  className="mt-1 flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as TimeGranularity)}
                >
                  {GRANULARITIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Меры</div>
            <div className="flex flex-wrap gap-2">
              {availableMeasures.map((measure) => (
                <button
                  key={measure.name}
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                    measures.includes(measure.name)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                  onClick={() => toggleItem(measures, measure.name, setMeasures)}
                >
                  {measure.shortTitle ?? measure.title ?? measure.name}
                </button>
              ))}
            </div>
          </div>

          {chartType !== 'kpi' && (
            <div>
              <div className="mb-2 text-sm font-medium">Измерения</div>
              <div className="flex flex-wrap gap-2">
                {availableDimensions.map((dimension) => (
                  <button
                    key={dimension.name}
                    type="button"
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                      dimensions.includes(dimension.name)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                    onClick={() => toggleItem(dimensions, dimension.name, setDimensions)}
                  >
                    {dimension.shortTitle ?? dimension.title ?? dimension.name}
                    {dimension.type === 'time' ? ' (дата)' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Фильтры</span>
              <Button type="button" variant="outline" size="sm" onClick={addFilterRow}>
                <Plus size={14} />
                Добавить
              </Button>
            </div>
            {filterRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">Фильтры не заданы</p>
            ) : (
              <div className="space-y-2">
                {filterRows.map((row, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
                    <select
                      className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
                      value={row.member}
                      onChange={(e) => updateFilterRow(index, { member: e.target.value })}
                    >
                      {availableDimensions.map((dimension) => (
                        <option key={dimension.name} value={dimension.name}>
                          {dimension.shortTitle ?? dimension.title ?? dimension.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
                      value={row.operator}
                      onChange={(e) => updateFilterRow(index, { operator: e.target.value })}
                    >
                      {FILTER_OPERATORS.map((operator) => (
                        <option key={operator.value} value={operator.value}>
                          {operator.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Значение (через запятую)"
                      value={row.values}
                      onChange={(e) => updateFilterRow(index, { values: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilterRow(index)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim() || measures.length === 0}>
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
