import type { Widget } from './schemas.js';

export interface CubeQueryPayload {
  measures: string[];
  dimensions?: string[];
  timeDimensions?: Array<{
    dimension: string;
    dateRange?: string;
    granularity?: string;
  }>;
  filters?: Array<{
    member: string;
    operator: string;
    values?: string | number | (string | number)[];
  }>;
  order?: Record<string, 'asc' | 'desc'>;
  limit?: number;
}

function isTimeDimension(widget: Widget, dimension: string): boolean {
  return widget.timeDimension === dimension;
}

export function buildWidgetQuery(widget: Widget): CubeQueryPayload | null {
  if (widget.measures.length === 0) {
    return null;
  }

  const query: CubeQueryPayload = {
    measures: widget.measures,
  };

  const regularDimensions = widget.dimensions.filter(
    (dimension) => !isTimeDimension(widget, dimension)
  );

  if (regularDimensions.length > 0) {
    query.dimensions = regularDimensions;
  }

  const filters = (widget.filters ?? [])
    .filter((filter) => filter.member && filter.operator)
    .map((filter) => ({
      member: filter.member!,
      operator: filter.operator!,
      ...(filter.values !== undefined ? { values: filter.values } : {}),
    }));

  if (filters.length > 0) {
    query.filters = filters;
  }

  if (widget.timeDimension && widget.dateRange) {
    const timeDimensionInChart = widget.dimensions.includes(widget.timeDimension);
    query.timeDimensions = [
      {
        dimension: widget.timeDimension,
        dateRange: widget.dateRange,
        ...(timeDimensionInChart && widget.granularity
          ? { granularity: widget.granularity }
          : {}),
      },
    ];
  }

  if (widget.chartType === 'kpi') {
    return query;
  }

  if (widget.dimensions.length === 0) {
    return null;
  }

  const sortKey =
    widget.dimensions.find((dimension) => isTimeDimension(widget, dimension)) ??
    widget.measures[0];

  if (sortKey) {
    query.order = { [sortKey]: 'asc' };
  }

  query.limit = 50;

  return query;
}
