import type { Widget } from '@umetrica/core';

export function nextWidgetLayout(widgets: Widget[], chartType: Widget['chartType']) {
  const maxY = widgets.reduce((max, widget) => Math.max(max, widget.layout.y + widget.layout.h), 0);

  if (chartType === 'kpi') {
    const kpiCount = widgets.filter((w) => w.chartType === 'kpi').length;
    return {
      x: (kpiCount * 3) % 12,
      y: maxY,
      w: 3,
      h: 2,
    };
  }

  if (chartType === 'pie' || chartType === 'donut') {
    return {
      x: 0,
      y: maxY,
      w: 4,
      h: 4,
    };
  }

  return {
    x: 0,
    y: maxY,
    w: 6,
    h: 4,
  };
}

export function widgetsToGridLayout(widgets: Widget[]) {
  return widgets.map((widget) => ({
    i: widget.id,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.chartType === 'kpi' ? 2 : 3,
    minH: widget.chartType === 'kpi' ? 2 : 3,
  }));
}
