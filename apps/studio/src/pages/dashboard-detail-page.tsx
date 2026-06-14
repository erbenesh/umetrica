import { ArrowLeft, BarChart3, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CubeApiProvider } from '@/components/cube/cube-provider';
import { DashboardFormDialog } from '@/components/dashboards/dashboard-form-dialog';
import { DashboardGrid } from '@/components/dashboards/dashboard-grid';
import { WidgetEditorDialog } from '@/components/dashboards/widget-editor-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard, useUpdateDashboard } from '@/hooks/use-dashboards';
import { useCanWriteDashboards } from '@/hooks/use-me';
import type { Widget } from '@umetrica/core';

function DashboardEditorContent({
  dashboardId,
  initialWidgets,
  readOnly = false,
}: {
  dashboardId: string;
  initialWidgets: Widget[];
  readOnly?: boolean;
}) {
  const updateMutation = useUpdateDashboard(dashboardId);
  const [widgets, setWidgets] = useState(initialWidgets);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const widgetsRef = useRef(widgets);
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  widgetsRef.current = widgets;

  useEffect(() => {
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  const persistWidgets = useCallback(
    async (nextWidgets: Widget[]) => {
      await updateMutation.mutateAsync({ widgets: nextWidgets });
    },
    [updateMutation]
  );

  const handleLayoutChange = (nextWidgets: Widget[]) => {
    setWidgets(nextWidgets);

    if (layoutTimerRef.current) {
      clearTimeout(layoutTimerRef.current);
    }

    layoutTimerRef.current = setTimeout(() => {
      void persistWidgets(nextWidgets);
    }, 500);
  };

  const handleSaveWidget = async (widget: Widget) => {
    const current = widgetsRef.current;
    const exists = current.some((item) => item.id === widget.id);
    const nextWidgets = exists
      ? current.map((item) => (item.id === widget.id ? widget : item))
      : [...current, widget];

    setWidgets(nextWidgets);
    await persistWidgets(nextWidgets);
  };

  const handleDeleteWidget = async (widgetId: string) => {
    const nextWidgets = widgetsRef.current.filter((widget) => widget.id !== widgetId);
    setWidgets(nextWidgets);
    await persistWidgets(nextWidgets);
  };

  const openCreate = () => {
    setEditingWidget(null);
    setEditorOpen(true);
  };

  const openEdit = (widget: Widget) => {
    setEditingWidget(widget);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus size={16} />
            Добавить виджет
          </Button>
        </div>
      )}

      {widgets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 size={18} />
              Дашборд пустой
            </CardTitle>
            <CardDescription>
              {readOnly
                ? 'На этом дашборде пока нет виджетов.'
                : 'Добавьте KPI или график на основе куба Orders.'}
            </CardDescription>
          </CardHeader>
          {!readOnly && (
            <CardContent>
              <Button onClick={openCreate}>
                <Plus size={16} />
                Добавить первый виджет
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <DashboardGrid
          widgets={widgets}
          onLayoutChange={handleLayoutChange}
          onEdit={openEdit}
          onDelete={handleDeleteWidget}
          readOnly={readOnly}
        />
      )}

      {!readOnly && (
        <WidgetEditorDialog
          open={editorOpen}
          widgets={widgets}
          initial={editingWidget}
          onClose={() => setEditorOpen(false)}
          onSave={handleSaveWidget}
          isSubmitting={updateMutation.isPending}
        />
      )}
    </div>
  );
}

export function DashboardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: dashboard, isLoading, error } = useDashboard(id);
  const updateMutation = useUpdateDashboard(id ?? '');
  const canWrite = useCanWriteDashboards();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isLoading) {
    return <div className="text-muted-foreground">Загрузка дашборда...</div>;
  }

  if (error || !dashboard || !id) {
    return (
      <Card className="border-insight-warning/40">
        <CardContent className="pt-6 text-sm text-insight-warning">
          Дашборд не найден
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/dashboards">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} />
            Назад
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-sm text-muted-foreground">{dashboard.description}</p>
          )}
        </div>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Pencil size={14} />
            Настройки
          </Button>
        )}
      </div>

      <CubeApiProvider>
        <DashboardEditorContent
          dashboardId={id}
          initialWidgets={dashboard.widgets}
          readOnly={!canWrite}
        />
      </CubeApiProvider>

      <DashboardFormDialog
        open={settingsOpen}
        title="Настройки дашборда"
        submitLabel="Сохранить"
        initial={{ name: dashboard.name, description: dashboard.description }}
        onClose={() => setSettingsOpen(false)}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync(payload);
        }}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
