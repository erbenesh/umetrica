import { Database, Ellipsis, FileUp, KeyRound, Loader2, Pencil, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { StatusBadge } from '@/components/doc/status-badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dropdown, DropdownMenu, DropdownTrigger } from '@/components/ui/dropdown';
import { MenuItem } from '@/components/ui/menu-item';
import { Card, CardContent } from '@/components/ui/card';
import { useConnections, useDeleteConnection, useSyncConnection } from '@/hooks/use-connections';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { cn } from '@/lib/utils';
import {
  connectionDocProps,
  connectionMethodLabel,
  connectionProviderLabel,
  connectionStatusLabel,
  connectionStatusVariant,
  databaseConnections,
  formatConnectionUpdatedAt,
  marketplaceConnections,
} from '@/lib/connection-format';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  viewer: 'Наблюдатель',
  member: 'Участник',
};

export function ConnectionsPage() {
  const location = useLocation();
  const [importFlash, setImportFlash] = useState<string | null>(null);
  const { data: me } = useMe();
  const { data, isLoading, error } = useConnections();
  const deleteConnection = useDeleteConnection();
  const syncConnection = useSyncConnection();
  const canWrite = useCanWriteDashboards();
  const role = me?.role ? (ROLE_LABELS[me.role] ?? me.role) : 'Участник';

  const items = data?.items ?? [];
  const marketplaces = marketplaceConnections(items);
  const databases = databaseConnections(items);

  useEffect(() => {
    const flash = (location.state as { importFlash?: string } | null)?.importFlash;
    if (flash) {
      setImportFlash(flash);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить подключение «${name}»?`)) return;
    await deleteConnection.mutateAsync(id);
  };

  const handleSync = async (id: string, name: string) => {
    try {
      const result = await syncConnection.mutateAsync(id);
      setImportFlash(`${name}: ${result.sync.message}`);
    } catch (err) {
      setImportFlash(err instanceof Error ? err.message : 'Ошибка синхронизации');
    }
  };

  return (
    <DocPage
      title="Источники данных"
      lead="Маркетплейсы, CSV и своя БД — лестница доверия: от рынка без ключа до полного API"
      icon={Database}
      back="auto"
      mobileTitle="Источники данных"
      mobileSubtitle={`${me?.organization?.name ?? 'Компания'} · ${role}`}
      props={connectionDocProps(items)}
    >
      {importFlash ? <DocCallout className="mb-4">{importFlash}</DocCallout> : null}

      {isLoading ? (
        <Card className="mb-4">
          <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Загрузка подключений...
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="mb-4">
          <CardContent className="p-3 text-xs text-destructive">
            {error instanceof Error ? error.message : 'Ошибка загрузки'}
          </CardContent>
        </Card>
      ) : null}

      <DocBlock>
        <DocBlockHead
          title="Маркетплейсы"
          actions={
            canWrite ? (
              <>
                <Link to="/settings/connections/upload-csv">
                  <Button size="sm" type="button">
                    <FileUp className="size-3.5" />
                    CSV
                  </Button>
                </Link>
                <Link to="/settings/connections/add-marketplace">
                  <Button size="sm" type="button">
                    <Plus className="size-3.5" />
                    API
                  </Button>
                </Link>
              </>
            ) : null
          }
        />
        {marketplaces.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Пока нет подключений маркетплейсов.</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableTh>Источник</DataTableTh>
              <DataTableTh>Способ</DataTableTh>
              <DataTableTh className="w-[140px]">Обновлено</DataTableTh>
              <DataTableTh className="w-[120px]">Статус</DataTableTh>
              <DataTableTh className="w-[56px]" />
            </DataTableHead>
            <DataTableBody>
              {marketplaces.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableTd>
                    <DataCell
                      title={connectionProviderLabel(row.provider)}
                      subtitle={row.config.subtitle ?? row.name}
                    />
                  </DataTableTd>
                  <DataTableTd className="text-muted-foreground">{connectionMethodLabel(row)}</DataTableTd>
                  <DataTableTd className="tabular-nums text-muted-foreground">
                    {formatConnectionUpdatedAt(row.lastSyncAt)}
                  </DataTableTd>
                  <DataTableTd>
                    <StatusBadge variant={connectionStatusVariant(row.status)}>
                      {connectionStatusLabel(row.status)}
                    </StatusBadge>
                  </DataTableTd>
                  <DataTableTd actions>
                    {canWrite ? (
                      <Dropdown>
                        <DropdownTrigger
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                          aria-label="Меню"
                        >
                          <Ellipsis className="size-4" />
                        </DropdownTrigger>
                        <DropdownMenu align="end">
                          {row.method === 'csv' ? (
                            <MenuItem
                              icon={Upload}
                              to="/settings/connections/upload-csv"
                              state={{
                                connectionId: row.id,
                                provider: row.provider,
                                reportType: row.config.reportType,
                              }}
                            >
                              Обновить файл
                            </MenuItem>
                          ) : null}
                          {row.method === 'api' ? (
                            <MenuItem
                              icon={RefreshCw}
                              disabled={syncConnection.isPending}
                              onClick={() => handleSync(row.id, connectionProviderLabel(row.provider))}
                            >
                              Синхронизировать
                            </MenuItem>
                          ) : null}
                          <MenuItem icon={KeyRound} to="/settings/connections/add-marketplace">
                            Подключить API
                          </MenuItem>
                          <MenuItem
                            icon={Trash2}
                            variant="danger"
                            onClick={() => handleDelete(row.id, row.name)}
                          >
                            Удалить
                          </MenuItem>
                        </DropdownMenu>
                      </Dropdown>
                    ) : (
                      <Button variant="ghost" size="icon-sm" type="button" aria-label="Меню" disabled>
                        <Ellipsis className="size-4" />
                      </Button>
                    )}
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </DocBlock>

      <DocBlock>
        <DocBlockHead
          title="Базы данных"
          hint="· опционально"
          actions={
            canWrite ? (
              <Link to="/settings/connections/add-db">
                <Button size="sm" type="button">
                  <Plus className="size-3.5" />
                  Добавить
                </Button>
              </Link>
            ) : null
          }
        />
        <p className="mb-3 text-[13px] text-muted-foreground">
          Для агентств и селлеров с собственной витриной в PostgreSQL.
        </p>
        {databases.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Базы данных не подключены.</p>
        ) : (
          <DataTable
            toolbar={
              <DataTableToolbar>
                <span className="font-medium text-foreground">Все</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {databases.length} {databases.length === 1 ? 'запись' : 'записей'}
                </span>
              </DataTableToolbar>
            }
          >
            <DataTableHead>
              <DataTableTh>Название</DataTableTh>
              <DataTableTh>Тип</DataTableTh>
              <DataTableTh>Хост</DataTableTh>
              <DataTableTh className="w-[120px]">Статус</DataTableTh>
              <DataTableTh className="w-[56px]" />
            </DataTableHead>
            <DataTableBody>
              {databases.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableTd>
                    <DataCell title={row.name} subtitle={row.config.subtitle} />
                  </DataTableTd>
                  <DataTableTd>{connectionProviderLabel(row.provider)}</DataTableTd>
                  <DataTableTd>
                    <code className="text-xs text-muted-foreground">
                      {row.config.host}
                      {row.config.port ? `:${row.config.port}` : ''}
                    </code>
                  </DataTableTd>
                  <DataTableTd>
                    <StatusBadge variant={connectionStatusVariant(row.status)}>
                      {row.status === 'active' ? 'Подключено' : connectionStatusLabel(row.status)}
                    </StatusBadge>
                  </DataTableTd>
                  <DataTableTd actions>
                    {canWrite ? (
                      <Dropdown>
                        <DropdownTrigger
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                          aria-label="Меню"
                        >
                          <Ellipsis className="size-4" />
                        </DropdownTrigger>
                        <DropdownMenu align="end">
                          <MenuItem icon={Pencil} to="/settings/connections/add-db">
                            Изменить
                          </MenuItem>
                          <MenuItem
                            icon={Trash2}
                            variant="danger"
                            onClick={() => handleDelete(row.id, row.name)}
                          >
                            Удалить
                          </MenuItem>
                        </DropdownMenu>
                      </Dropdown>
                    ) : (
                      <Button variant="ghost" size="icon-sm" type="button" disabled>
                        <Ellipsis className="size-4" />
                      </Button>
                    )}
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </DocBlock>

      <DocBlock>
        <DocCallout variant="info">
          Ключ не обязателен: рыночные инсайты работают без кабинета.{' '}
          <Link to="/settings/security" className="font-medium text-primary hover:underline">
            Безопасность API →
          </Link>
        </DocCallout>
      </DocBlock>
    </DocPage>
  );
}
