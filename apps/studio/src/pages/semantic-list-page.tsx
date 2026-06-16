import { Box, Database, Eye, Layers, List, Loader2, Network, Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { SemanticNewCubeDialog } from '@/components/semantic/semantic-new-cube-dialog';
import { SemanticNewViewDialog } from '@/components/semantic/semantic-new-view-dialog';
import { SemanticWorkspaceCanvas } from '@/components/semantic/semantic-workspace-canvas';
import { Button } from '@/components/ui/button';
import { useConnections } from '@/hooks/use-connections';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { useSemanticWorkspace } from '@/hooks/use-semantic';

function resolveSourceLabel(hasPostgres: boolean) {
  return hasPostgres ? 'PostgreSQL' : 'Демо · PostgreSQL';
}

export function SemanticListPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const canWrite = useCanWriteDashboards();
  const [newCubeOpen, setNewCubeOpen] = useState(false);
  const [newViewOpen, setNewViewOpen] = useState(false);
  const [tab, setTab] = useState<'cubes' | 'views'>('cubes');
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const { data: connections } = useConnections();
  const { data: workspace, isLoading, error } = useSemanticWorkspace();

  const orgName = me?.organization?.name ?? 'Компания';
  const hasPostgres = (connections?.items ?? []).some(
    (item) => item.provider === 'postgresql' || item.provider === 'postgres'
  );
  const cubes = workspace?.cubes ?? [];
  const views = workspace?.views ?? [];
  const layout = workspace?.layout ?? { cubes: {}, views: {} };
  const sourceLabel = resolveSourceLabel(hasPostgres);

  const settingsAction = (
    <Link to="/settings" aria-label="Настройки">
      <Button variant="ghost" size="icon-sm" type="button">
        <Settings size={16} />
      </Button>
    </Link>
  );

  const handleJoinCubes = (sourceCubeName: string, targetCubeName: string) => {
    if (!canWrite) return;
    navigate(`/semantic/cubes/${sourceCubeName}?tab=relationships&joinTarget=${targetCubeName}`);
  };

  if (!isLoading && cubes.length === 0) {
    return (
      <DocPage
        title="Семантический слой"
        lead="Data graph: кубы, joins и views"
        icon={Layers}
        mobileTitle="Семантика"
        mobileActions={settingsAction}
      >
        <DocBlock>
          <div className="empty-state">
            <Database className="empty-state__icon" strokeWidth={1.5} />
            <h2 className="empty-state__title">Нет кубов</h2>
            <p className="empty-state__desc">
              Подключите PostgreSQL и создайте первый куб — затем связывайте таблицы через joins и
              собирайте views.
            </p>
            <div className="empty-state__actions">
              <Link to="/settings/connections/add-db">
                <Button type="button">Подключить БД</Button>
              </Link>
              <Button type="button" disabled={!canWrite} onClick={() => setNewCubeOpen(true)}>
                Новый куб
              </Button>
            </div>
          </div>
        </DocBlock>
        <SemanticNewCubeDialog open={newCubeOpen} onClose={() => setNewCubeOpen(false)} />
      </DocPage>
    );
  }

  return (
    <DocPage
      title="Семантический слой"
      lead="Data graph: кубы, joins и views"
      icon={Layers}
      mobileTitle="Семантика"
      mobileActions={settingsAction}
      props={[
        { label: 'Кубов', value: String(cubes.length) },
        { label: 'Views', value: String(views.length) },
        { label: 'Компания', value: orgName },
        { label: 'Источник', value: sourceLabel },
      ]}
    >
      {error ? (
        <DocCallout className="mb-4 border-destructive/40">
          {error instanceof Error ? error.message : 'Ошибка загрузки workspace'}
        </DocCallout>
      ) : null}

      <DocBlock className="semantic-workspace-page">
        <div className="semantic-workspace-toolbar">
          <div className="segmented segmented--dense" role="tablist" aria-label="Раздел семантики">
            <button
              className={`segmented__btn ${tab === 'cubes' ? 'is-active' : ''}`}
              type="button"
              role="tab"
              onClick={() => setTab('cubes')}
            >
              <Box size={14} />
              Кубы
            </button>
            <button
              className={`segmented__btn ${tab === 'views' ? 'is-active' : ''}`}
              type="button"
              role="tab"
              onClick={() => setTab('views')}
            >
              <Eye size={14} />
              Views
            </button>
          </div>

          <span className="semantic-workspace-toolbar__spacer" />

          <div className="segmented segmented--dense" role="group" aria-label="Режим отображения">
            <button
              className={`segmented__btn ${viewMode === 'graph' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setViewMode('graph')}
            >
              <Network size={14} />
              Граф
            </button>
            <button
              className={`segmented__btn ${viewMode === 'list' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setViewMode('list')}
            >
              <List size={14} />
              Список
            </button>
          </div>

          {tab === 'cubes' ? (
            <Button size="sm" type="button" disabled={!canWrite} onClick={() => setNewCubeOpen(true)}>
              <Plus size={14} />
              Куб
            </Button>
          ) : (
            <Button size="sm" type="button" disabled={!canWrite} onClick={() => setNewViewOpen(true)}>
              <Plus size={14} />
              View
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Загрузка workspace...
          </div>
        ) : viewMode === 'graph' ? (
          <SemanticWorkspaceCanvas
            tab={tab}
            cubes={cubes}
            views={views}
            layout={layout}
            canWrite={canWrite}
            onJoinCubes={handleJoinCubes}
          />
        ) : (
          <div className="semantic-workspace-list">
            {tab === 'cubes'
              ? cubes.map((cube) => (
                  <Link key={cube.name} to={`/semantic/cubes/${cube.name}`} className="semantic-workspace-list__item">
                    <strong>{cube.name}</strong>
                    <span>{cube.subtitle}</span>
                  </Link>
                ))
              : views.map((view) => (
                  <Link key={view.name} to={`/semantic/views/${view.name}`} className="semantic-workspace-list__item">
                    <strong>{view.name}</strong>
                    <span>{view.title}</span>
                  </Link>
                ))}
          </div>
        )}
      </DocBlock>

      <SemanticNewCubeDialog open={newCubeOpen} onClose={() => setNewCubeOpen(false)} />
      <SemanticNewViewDialog open={newViewOpen} onClose={() => setNewViewOpen(false)} cubes={cubes} />
    </DocPage>
  );
}
