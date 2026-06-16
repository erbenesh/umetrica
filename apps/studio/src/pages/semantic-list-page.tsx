import { Box, Database, Layers, Loader2, Plus, Settings, Table } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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
import { SemanticNewCubeDialog } from '@/components/semantic/semantic-new-cube-dialog';
import { Button } from '@/components/ui/button';
import { useConnections } from '@/hooks/use-connections';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { useSemanticCubes } from '@/hooks/use-semantic';
import {
  formatSemanticUpdatedAt,
  PLANNED_SEMANTIC_CUBES,
  semanticStatusLabel,
  semanticStatusTag,
} from '@/lib/semantic-catalog';

function resolveSourceLabel(hasPostgres: boolean) {
  return hasPostgres ? 'PostgreSQL' : 'Демо · PostgreSQL';
}

export function SemanticListPage() {
  const { data: me } = useMe();
  const canWrite = useCanWriteDashboards();
  const [newCubeOpen, setNewCubeOpen] = useState(false);
  const { data: connections } = useConnections();
  const { data, isLoading, error } = useSemanticCubes();

  const orgName = me?.organization?.name ?? 'Компания';
  const hasPostgres = (connections?.items ?? []).some(
    (item) => item.provider === 'postgresql' || item.provider === 'postgres'
  );
  const cubes = data?.items ?? [];
  const activeCubes = cubes.filter((cube) => cube.status === 'published' || cube.status === 'draft').length;
  const sourceLabel = resolveSourceLabel(hasPostgres);

  const settingsAction = (
    <Link to="/settings" aria-label="Настройки">
      <Button variant="ghost" size="icon-sm" type="button">
        <Settings size={16} />
      </Button>
    </Link>
  );

  if (!isLoading && cubes.length === 0) {
    return (
      <DocPage
        title="Семантический слой"
        lead="Кубы как граф нод: таблица → куб → меры и измерения"
        icon={Layers}
        mobileTitle="Семантика"
        mobileActions={settingsAction}
      >
        <DocBlock>
          <div className="empty-state">
            <Database className="empty-state__icon" strokeWidth={1.5} />
            <h2 className="empty-state__title">Нет кубов</h2>
            <p className="empty-state__desc">
              Сначала подключите PostgreSQL, затем создайте первый куб в node-редакторе — маппинг
              таблицы на меры и измерения.
            </p>
            <div className="empty-state__actions">
              <Link to="/settings/connections/add-db">
                <Button type="button">Подключить БД</Button>
              </Link>
            </div>
          </div>
        </DocBlock>
      </DocPage>
    );
  }

  return (
    <DocPage
      title="Семантический слой"
      lead="Кубы как граф нод: таблица → куб → меры и измерения"
      icon={Layers}
      mobileTitle="Семантика"
      mobileActions={settingsAction}
      props={[
        { label: 'Кубов', value: `${activeCubes} активных` },
        { label: 'Компания', value: orgName },
        { label: 'Источник', value: sourceLabel },
      ]}
    >
      <DocCallout variant="info">
        <span>
          Редактор — <strong>node graph</strong> на canvas. Клик по ноде открывает инспектор справа.
          Публикация черновика — owner/admin.
        </span>
        {cubes[0] ? (
          <Link to={`/semantic/cubes/${cubes[0].name}`}>
            <Button variant="ghost" size="sm" type="button">
              Открыть {cubes[0].name}
            </Button>
          </Link>
        ) : null}
      </DocCallout>

      {error ? (
        <DocCallout className="mb-4 border-destructive/40">
          {error instanceof Error ? error.message : 'Ошибка загрузки кубов'}
        </DocCallout>
      ) : null}

      <DocBlock>
        <DocBlockHead
          title="Кубы"
          actions={
            <Button
              size="sm"
              type="button"
              disabled={!canWrite}
              onClick={() => setNewCubeOpen(true)}
            >
              <Plus size={14} />
              Новый куб
            </Button>
          }
        />
        <DataTable
          toolbar={
            <DataTableToolbar>
              <span className="db-view is-active">
                <Table size={14} />
                Таблица
              </span>
              <span className="db-toolbar__spacer" />
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Загрузка...
                </span>
              ) : null}
            </DataTableToolbar>
          }
        >
          <DataTableHead>
            <DataTableRow>
              <DataTableTh>Куб</DataTableTh>
              <DataTableTh className="w-[100px]">Меры</DataTableTh>
              <DataTableTh className="w-[120px]">Измерения</DataTableTh>
              <DataTableTh className="w-[100px]">Виджетов</DataTableTh>
              <DataTableTh className="w-[140px]">Статус</DataTableTh>
              <DataTableTh className="w-[160px]">Обновлён</DataTableTh>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {cubes.map((cube) => (
              <DataTableRow key={cube.name}>
                <DataTableTd>
                  <Link to={`/semantic/cubes/${cube.name}`} className="block text-inherit">
                    <span className="db-cell__icon">
                      <Box size={16} />
                    </span>
                    <DataCell title={cube.name} subtitle={cube.subtitle} />
                  </Link>
                </DataTableTd>
                <DataTableTd>
                  <div className="tabular-nums">{cube.measureCount}</div>
                </DataTableTd>
                <DataTableTd>
                  <div className="tabular-nums">{cube.dimensionCount}</div>
                </DataTableTd>
                <DataTableTd>
                  <div className="tabular-nums">{cube.widgetCount}</div>
                </DataTableTd>
                <DataTableTd>
                  <span className={semanticStatusTag(cube.status)}>{semanticStatusLabel(cube.status)}</span>
                </DataTableTd>
                <DataTableTd>
                  <div className="tabular-nums text-muted-foreground">
                    {formatSemanticUpdatedAt(cube.updatedAt)}
                  </div>
                </DataTableTd>
              </DataTableRow>
            ))}

            {PLANNED_SEMANTIC_CUBES.map((cube) => (
              <DataTableRow key={cube.id} className="db-row--muted">
                <DataTableTd>
                  <span className="db-cell__icon">
                    <Box size={16} />
                  </span>
                  <DataCell title={cube.name} subtitle={cube.subtitle} />
                </DataTableTd>
                <DataTableTd>
                  <div className="text-muted-foreground tabular-nums">—</div>
                </DataTableTd>
                <DataTableTd>
                  <div className="text-muted-foreground tabular-nums">—</div>
                </DataTableTd>
                <DataTableTd>
                  <div className="text-muted-foreground tabular-nums">0</div>
                </DataTableTd>
                <DataTableTd>
                  <span className={semanticStatusTag(cube.status)}>{semanticStatusLabel(cube.status)}</span>
                </DataTableTd>
                <DataTableTd>
                  <div className="text-muted-foreground tabular-nums">—</div>
                </DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </DocBlock>

      <SemanticNewCubeDialog open={newCubeOpen} onClose={() => setNewCubeOpen(false)} />
    </DocPage>
  );
}
