import { BarChart3, LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { CreateDashboardDialog } from '@/components/dashboards/create-dashboard-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateDashboard, useDashboards, useDeleteDashboard } from '@/hooks/use-dashboards';
import { useCanWriteDashboards } from '@/hooks/use-me';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function DashboardsListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error } = useDashboards();
  const createMutation = useCreateDashboard();
  const deleteMutation = useDeleteDashboard();
  const canWrite = useCanWriteDashboards();

  const handleCreate = async (payload: { name: string; description?: string }) => {
    await createMutation.mutateAsync(payload);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить дашборд «${name}»?`)) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard />
          <div>
            <h1 className="text-2xl font-bold">Дашборды</h1>
            <p className="text-sm text-muted-foreground">
              {data ? `${data.total} дашборд(ов)` : 'Загрузка...'}
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!canWrite}>
          <Plus size={16} />
          Создать дашборд
        </Button>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">Загрузка списка...</div>
      )}

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
            <Button onClick={() => setCreateOpen(true)} disabled={!canWrite}>
              <Plus size={16} />
              Создать дашборд
            </Button>
          </CardContent>
        </Card>
      )}

      {data && data.items.length > 0 && (
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
      )}

      <CreateDashboardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
