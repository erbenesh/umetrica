import {
  BarChart3,
  CalendarClock,
  Ellipsis,
  Filter,
  Loader2,
  Plus,
  Share2,
  Trash2,
  Type,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CubeApiProvider } from '@/components/cube/cube-provider';
import { DashboardFormDialog } from '@/components/dashboards/dashboard-form-dialog';
import { DashboardGrid } from '@/components/dashboards/dashboard-grid';
import { DashboardToolbar } from '@/components/dashboards/dashboard-toolbar';
import { WidgetEditorDialog } from '@/components/dashboards/widget-editor-dialog';
import { DocBlock } from '@/components/doc/doc-block';
import { DocBlockHead } from '@/components/doc/doc-block-head';
import { DocPage } from '@/components/doc/doc-page';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dropdown, DropdownMenu, DropdownTrigger } from '@/components/ui/dropdown';
import { MenuItem } from '@/components/ui/menu-item';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard, useDeleteDashboard, useUpdateDashboard } from '@/hooks/use-dashboards';
import { useCanWriteDashboards } from '@/hooks/use-me';
import type { Widget } from '@sellerpool/core';
import { cn } from '@/lib/utils';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

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
    async (nextWidgets: Widget[], options?: { successMessage?: string }) => {
      await updateMutation.mutateAsync({
        input: { widgets: nextWidgets },
        silent: !options?.successMessage,
        successMessage: options?.successMessage,
      });
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
    await persistWidgets(nextWidgets, {
      successMessage: exists ? 'Виджет обновлён' : 'Виджет добавлен',
    });
  };

  const handleDeleteWidget = async (widgetId: string) => {
    const nextWidgets = widgetsRef.current.filter((widget) => widget.id !== widgetId);
    setWidgets(nextWidgets);
    await persistWidgets(nextWidgets, { successMessage: 'Виджет удалён' });
  };

  const openCreate = () => {
    setEditingWidget(null);
    setEditorOpen(true);
  };

  const openEdit = (widget: Widget) => {
    setEditingWidget(widget);
    setEditorOpen(true);
  };

  const addButton = !readOnly ? (
    <Dropdown>
      <DropdownTrigger className={cn(buttonVariants({ size: 'sm' }))}>
        <Plus size={14} />
        Добавить
      </DropdownTrigger>
      <DropdownMenu align="end">
        <MenuItem icon={BarChart3} onClick={openCreate}>
          График
        </MenuItem>
        <MenuItem icon={Filter} onClick={openCreate}>
          Фильтр
        </MenuItem>
        <MenuItem icon={CalendarClock} onClick={openCreate}>
          Детализация
        </MenuItem>
        <MenuItem icon={Type} onClick={openCreate}>
          Текст
        </MenuItem>
      </DropdownMenu>
    </Dropdown>
  ) : null;

  return (
    <>
      <DocBlockHead title="Метрики" actions={addButton} />

      {widgets.length > 0 ? <DashboardToolbar /> : null}

      {widgets.length === 0 ? (
        <Card className="border-border">
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
              <Button onClick={openCreate} type="button">
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
    </>
  );
}

export function DashboardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dashboard, isLoading, error } = useDashboard(id);
  const updateMutation = useUpdateDashboard(id ?? '');
  const deleteMutation = useDeleteDashboard();
  const canWrite = useCanWriteDashboards();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleDeleteDashboard = async () => {
    if (!dashboard || !id) return;
    if (!confirm(`Удалить дашборд «${dashboard.name}»?`)) return;
    await deleteMutation.mutateAsync(id);
    navigate('/dashboards');
  };

  if (isLoading) {
    return (
      <DocPage title="Дашборд" back="auto" mobileTitle="Дашборд">
        <Card className="border-border">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загрузка дашборда...
          </CardContent>
        </Card>
      </DocPage>
    );
  }

  if (error || !dashboard || !id) {
    return (
      <DocPage title="Дашборд" back="auto" mobileTitle="Дашборд">
        <Card className="border-insight-warning/40">
          <CardContent className="pt-6 text-sm text-insight-warning">Дашборд не найден</CardContent>
        </Card>
      </DocPage>
    );
  }

  const headerMenu = canWrite ? (
    <Dropdown>
      <DropdownTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        aria-label="Действия"
      >
        <Ellipsis className="size-4" />
      </DropdownTrigger>
      <DropdownMenu align="end">
        <MenuItem icon={Share2} onClick={() => setSettingsOpen(true)}>
          Embed и доступ
        </MenuItem>
        <MenuItem icon={Trash2} variant="danger" onClick={() => void handleDeleteDashboard()}>
          Удалить
        </MenuItem>
      </DropdownMenu>
    </Dropdown>
  ) : null;

  return (
    <>
      <DocPage
        title={dashboard.name}
        lead={dashboard.description ?? 'Ежедневный мониторинг KPI'}
        icon={BarChart3}
        back="auto"
        actions={headerMenu}
        mobileActions={headerMenu}
        props={[
          { label: 'Виджетов', value: String(dashboard.widgets.length) },
          { label: 'Обновлён', value: formatDate(dashboard.updatedAt) },
          { label: 'Период', value: '7 дней' },
        ]}
      >
        <DocBlock>
          <CubeApiProvider>
            <DashboardEditorContent
              dashboardId={id}
              initialWidgets={dashboard.widgets}
              readOnly={!canWrite}
            />
          </CubeApiProvider>
        </DocBlock>
      </DocPage>

      <DashboardFormDialog
        open={settingsOpen}
        title="Настройки дашборда"
        submitLabel="Сохранить"
        initial={{ name: dashboard.name, description: dashboard.description }}
        onClose={() => setSettingsOpen(false)}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync({
            input: payload,
            successMessage: 'Настройки дашборда сохранены',
          });
        }}
        isSubmitting={updateMutation.isPending}
      />
    </>
  );
}
