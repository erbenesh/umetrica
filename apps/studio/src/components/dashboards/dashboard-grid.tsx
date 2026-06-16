import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import type { Widget } from '@sellerpool/core';
import type { Layout } from 'react-grid-layout';

import { Edit2, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';

import { WidgetRenderer } from '@/components/dashboards/widget-renderer';
import { Button } from '@/components/ui/button';
import { widgetsToGridLayout } from '@/lib/widget-layout';
import { cn } from '@/lib/utils';

const ResponsiveGrid = WidthProvider(Responsive);

interface DashboardGridProps {
  widgets: Widget[];
  onLayoutChange: (widgets: Widget[]) => void;
  onEdit: (widget: Widget) => void;
  onDelete: (widgetId: string) => void;
  readOnly?: boolean;
}

export function DashboardGrid({
  widgets,
  onLayoutChange,
  onEdit,
  onDelete,
  readOnly = false,
}: DashboardGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const layouts = useMemo(
    () => ({
      lg: widgetsToGridLayout(widgets),
    }),
    [widgets]
  );

  const handleLayoutChange = useCallback(
    (layout: Layout[]) => {
      if (readOnly) return;

      const updated = widgets.map((widget) => {
        const item = layout.find((entry) => entry.i === widget.id);
        if (!item) return widget;

        return {
          ...widget,
          layout: {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          },
        };
      });

      onLayoutChange(updated);
    },
    [onLayoutChange, readOnly, widgets]
  );

  if (widgets.length === 0) {
    return null;
  }

  return (
    <ResponsiveGrid
      className="dashboard-grid"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
      rowHeight={72}
      margin={[1, 1]}
      containerPadding={[0, 0]}
      isDraggable={!readOnly}
      isResizable={!readOnly}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".widget-drag-handle"
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className="relative"
          onMouseEnter={() => setHoveredId(widget.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {!readOnly && hoveredId === widget.id && (
            <div className="absolute right-2 top-2 z-10 flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(widget)}
              >
                <Edit2 size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => onDelete(widget.id)}
              >
                <Trash2 size={14} className="text-insight-warning" />
              </Button>
            </div>
          )}
          <div className={cn('h-full', !readOnly && 'widget-drag-handle cursor-move')}>
            <WidgetRenderer widget={widget} />
          </div>
        </div>
      ))}
    </ResponsiveGrid>
  );
}
