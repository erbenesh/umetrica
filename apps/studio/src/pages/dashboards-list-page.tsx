import { BarChart3, LayoutDashboard, LayoutGrid, Plus, Settings, Table, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { CreateDashboardDialog } from '@/components/dashboards/create-dashboard-dialog';
import {
  DataCell,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  DataTableToolbar,
} from '@/components/doc/data-table';
import { DocBlock } from '@/components/doc/doc-block';
import { DocBlockHead } from '@/components/doc/doc-block-head';
import { DocPage } from '@/components/doc/doc-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateDashboard, useDashboards, useDeleteDashboard } from '@/hooks/use-dashboards';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { cn } from '@/lib/utils';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function dashboardIcon(index: number) {
  const icons = [BarChart3, LayoutDashboard, BarChart3];
  return icons[index % icons.length] ?? BarChart3;
}

export function DashboardsListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<'table' | 'gallery'>('table');
  const { data, isLoading, error } = useDashboards();
  const { data: me } = useMe();
  const createMutation = useCreateDashboard();
  const deleteMutation = useDeleteDashboard();
  const canWrite = useCanWriteDashboards();

  const createButton = (
    <Button onClick={() => setCreateOpen(true)} disabled={!canWrite} size="sm" type="button">
      <Plus size={14} />
      <span className="hidden sm:inline">Создать дашборд</span>
      <span className="sm:hidden">Создать</span>
    </Button>
  );

  const mobileActions = (
    <>
      {createButton}
      <Link to="/settings" aria-label="Настройки" className="md:hidden">
        <Button variant="ghost" size="icon-sm" type="button">
          <Settings size={16} />
        </Button>
      </Link>
    </>
  );

  const handleCreate = async (payload: { name: string; description?: string }) => {
    await createMutation.mutateAsync(payload);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить дашборд «${name}»?`)) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <>
      <DocPage
        title="Дашборды"
        lead="Рабочие пространства с виджетами и метриками"
        icon={LayoutDashboard}
        actions={createButton}
        mobileActions={mobileActions}
        props={[
          { label: 'Всего', value: isLoading ? '…' : String(data?.total ?? 0) },
          { label: 'Компания', value: me?.organization?.name ?? '—' },
        ]}
      >
        <DocBlock>
          <DocBlockHead title="База дашбордов" actions={createButton} />

          {isLoading && <div className="text-sm text-muted-foreground">Загрузка списка...</div>}

          {error && (
            <Card className="border-insight-warning/40">
              <CardContent className="pt-6 text-sm text-insight-warning">
                Не удалось загрузить дашборды: {error.message}
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && data?.items.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 size={18} />
                  Пока пусто
                </CardTitle>
                <CardDescription>
                  Создайте первый дашборд, чтобы собирать графики и KPI.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCreateOpen(true)} disabled={!canWrite} type="button">
                  <Plus size={16} />
                  Создать дашборд
                </Button>
              </CardContent>
            </Card>
          )}

          {data && data.items.length > 0 && view === 'table' ? (
            <DataTable
              toolbar={
                <DataTableToolbar className="db-toolbar">
                  <button
                    type="button"
                    className={cn('db-view is-active')}
                    onClick={() => setView('table')}
                  >
                    <Table size={14} />
                    Таблица
                  </button>
                  <button
                    type="button"
                    className="db-view"
                    onClick={() => setView('gallery')}
                  >
                    <LayoutGrid size={14} />
                    Галерея
                  </button>
                  <span className="db-toolbar__spacer" />
                </DataTableToolbar>
              }
            >
              <DataTableHead>
                <DataTableRow>
                  <DataTableTh>Название</DataTableTh>
                  <DataTableTh className="w-[140px]">Виджетов</DataTableTh>
                  <DataTableTh className="w-[180px]">Обновлён</DataTableTh>
                  {canWrite ? <DataTableTh className="w-[52px]" /> : null}
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {data.items.map((dashboard, index) => {
                  const Icon = dashboardIcon(index);

                  return (
                    <DataTableRow key={dashboard.id}>
                      <DataTableTd>
                        <Link to={`/dashboards/${dashboard.id}`} className="block text-inherit">
                          <div className="db-cell">
                            <span className="db-cell__icon">
                              <Icon size={16} />
                            </span>
                            <DataCell
                              title={dashboard.name}
                              subtitle={dashboard.description ?? 'Без описания'}
                            />
                          </div>
                        </Link>
                      </DataTableTd>
                      <DataTableTd>
                        <div className="db-cell tabular-nums">{dashboard.widgets.length}</div>
                      </DataTableTd>
                      <DataTableTd>
                        <div className="db-cell text-muted-foreground tabular-nums">
                          {formatDate(dashboard.updatedAt)}
                        </div>
                      </DataTableTd>
                      {canWrite ? (
                        <DataTableTd actions>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(dashboard.id, dashboard.name)}
                            disabled={deleteMutation.isPending}
                            type="button"
                            aria-label={`Удалить ${dashboard.name}`}
                          >
                            <Trash2 size={14} className="text-insight-warning" />
                          </Button>
                        </DataTableTd>
                      ) : null}
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          ) : null}

          {data && data.items.length > 0 && view === 'gallery' ? (
            <div>
              <DataTableToolbar className="db-toolbar mb-3 rounded-md border border-border">
                <button type="button" className="db-view" onClick={() => setView('table')}>
                  <Table size={14} />
                  Таблица
                </button>
                <button
                  type="button"
                  className={cn('db-view is-active')}
                  onClick={() => setView('gallery')}
                >
                  <LayoutGrid size={14} />
                  Галерея
                </button>
                <span className="db-toolbar__spacer" />
              </DataTableToolbar>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((dashboard) => (
                  <Card key={dashboard.id} className="group transition-colors hover:border-primary/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/dashboards/${dashboard.id}`} className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base hover:text-primary">
                            {dashboard.name}
                          </CardTitle>
                          {dashboard.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {dashboard.description}
                            </CardDescription>
                          )}
                        </Link>
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => handleDelete(dashboard.id, dashboard.name)}
                            disabled={deleteMutation.isPending}
                            type="button"
                          >
                            <Trash2 size={16} className="text-insight-warning" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{dashboard.widgets.length} виджет(ов)</span>
                      <span>{formatDate(dashboard.updatedAt)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </DocBlock>
      </DocPage>

      <CreateDashboardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />
    </>
  );
}
