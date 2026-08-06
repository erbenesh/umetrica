import type { SemanticCubeDefinition } from '@sellerpool/core';
import { CircleHelp, Loader2, PanelLeftClose, Redo2, Undo2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { SemanticCubeInspector } from '@/components/semantic/semantic-cube-inspector';
import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';
import { SemanticHierarchiesPanel } from '@/components/semantic/semantic-hierarchies-panel';
import { SemanticPreAggregationsPanel } from '@/components/semantic/semantic-pre-aggregations-panel';
import { SemanticRelationshipsPanel } from '@/components/semantic/semantic-relationships-panel';
import { SemanticSegmentsPanel } from '@/components/semantic/semantic-segments-panel';
import { SemanticYamlPanel } from '@/components/semantic/semantic-yaml-panel';
import { Button } from '@/components/ui/button';
import { SEMANTIC_CUBE_ADVANCED_TABS } from '@/lib/semantic-guide';
import { SEMANTIC_CUBE_TAB_LABELS } from '@/lib/semantic-labels';
import { cn } from '@/lib/utils';

const SECTIONS: SemanticCubeEditorTab[] = [
  'visual',
  'relationships',
  'segments',
  'hierarchies',
  'rollups',
  'yaml',
];

interface SemanticCubeSidePanelProps {
  cubeName: string;
  cubeLabel: string;
  tab: SemanticCubeEditorTab;
  draft: SemanticCubeDefinition;
  selected: string;
  canWrite: boolean;
  connectionLabel: string;
  widgetCount: number;
  isDraft: boolean;
  savedHint: boolean;
  isSaving: boolean;
  isDiscarding: boolean;
  joinTarget?: string;
  tourActive?: boolean;
  onTabChange: (tab: SemanticCubeEditorTab) => void;
  onSelect?: (id: string) => void;
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
  onPublish: () => void;
  onStartTour?: () => void;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
  onAddMeasure: () => void;
  onAddDimension: () => void;
  onDeleteMeasure?: (id: string) => void;
  onDeleteDimension?: (id: string) => void;
}

export function SemanticCubeSidePanel({
  cubeName,
  cubeLabel,
  tab,
  draft,
  selected,
  canWrite,
  connectionLabel,
  widgetCount,
  isDraft,
  savedHint,
  isSaving,
  isDiscarding,
  joinTarget,
  tourActive = false,
  onTabChange,
  onSelect,
  onClose,
  onUndo,
  onRedo,
  onDiscard,
  onPublish,
  onStartTour,
  onDraftChange,
  onAddMeasure,
  onAddDimension,
  onDeleteMeasure,
  onDeleteDimension,
}: SemanticCubeSidePanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected || !bodyRef.current) return;
    const escaped = CSS.escape(selected);
    const entity = bodyRef.current.querySelector(`[data-canvas-entity="${escaped}"]`);
    entity?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected, tab]);

  return (
    <aside className="semantic-ide__inspector semantic-cube-side-panel" data-tour="cube-inspector">
      <div className="semantic-cube-side-panel__chrome">
        <div className="semantic-cube-side-panel__leading">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="semantic-ide__back-btn"
            onClick={onClose}
          >
            <PanelLeftClose size={16} />
            К графу
          </Button>
          <span className="semantic-cube-side-panel__name" title={cubeName}>
            {cubeLabel}
          </span>
          <span
            className={cn(
              'db-tag',
              isDraft ? 'db-tag--blue' : 'db-tag--green',
              'semantic-cube-side-panel__status'
            )}
          >
            {isDraft ? 'Черновик' : 'Опубликован'}
          </span>
          {savedHint ? (
            <span className="semantic-cube-side-panel__hint">Сохранено</span>
          ) : isSaving ? (
            <span className="semantic-cube-side-panel__hint semantic-cube-side-panel__hint--pending">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Сохранение…
            </span>
          ) : null}
        </div>

        {canWrite ? (
          <div className="semantic-cube-side-panel__actions">
            <div className="semantic-cube-side-panel__history" role="group" aria-label="История правок">
              <Button variant="ghost" size="icon-sm" type="button" onClick={onUndo} aria-label="Отменить шаг">
                <Undo2 size={16} />
              </Button>
              <Button variant="ghost" size="icon-sm" type="button" onClick={onRedo} aria-label="Повторить шаг">
                <Redo2 size={16} />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onDiscard}
              disabled={!isDraft || isDiscarding}
            >
              Сбросить
            </Button>
            <Button size="sm" type="button" data-tour="cube-publish" onClick={onPublish}>
              Опубликовать
            </Button>
          </div>
        ) : null}
      </div>

      <nav
        className="semantic-cube-side-panel__sections"
        role="tablist"
        aria-label="Разделы редактора куба"
        data-tour="cube-tabs"
      >
        {SECTIONS.map((item) => {
          const isAdvanced = SEMANTIC_CUBE_ADVANCED_TABS.includes(item);
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              data-tour={`cube-tab-${item}`}
              className={cn(
                'semantic-cube-side-panel__section',
                tab === item && 'is-active',
                isAdvanced && 'semantic-cube-side-panel__section--advanced'
              )}
              onClick={() => onTabChange(item)}
            >
              {SEMANTIC_CUBE_TAB_LABELS[item]}
            </button>
          );
        })}
        {onStartTour ? (
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            data-tour="cube-help"
            className={cn('semantic-cube-side-panel__help', tourActive && 'is-active')}
            aria-label="Обучение"
            title="Обучение"
            aria-pressed={tourActive}
            onClick={onStartTour}
          >
            <CircleHelp size={16} />
          </Button>
        ) : null}
      </nav>

      <div ref={bodyRef} className="semantic-cube-side-panel__body semantic-ide__inspector-scroll">
        {tab === 'visual' ? (
          <SemanticCubeInspector
            embedded
            draft={draft}
            selected={selected}
            canWrite={canWrite}
            connectionLabel={connectionLabel}
            widgetCount={widgetCount}
            onDraftChange={onDraftChange}
            onAddMeasure={onAddMeasure}
            onAddDimension={onAddDimension}
            onDeleteMeasure={onDeleteMeasure}
            onDeleteDimension={onDeleteDimension}
          />
        ) : tab === 'yaml' ? (
          <div data-canvas-entity="yaml:editor">
            <SemanticYamlPanel cubeName={cubeName} canWrite={canWrite} embedded />
          </div>
        ) : tab === 'relationships' ? (
          <SemanticRelationshipsPanel
            embedded
            draft={draft}
            selected={selected}
            canWrite={canWrite}
            joinTarget={joinTarget}
            onDraftChange={onDraftChange}
            onSelect={onSelect}
          />
        ) : tab === 'segments' ? (
          <SemanticSegmentsPanel
            embedded
            draft={draft}
            selected={selected}
            canWrite={canWrite}
            onDraftChange={onDraftChange}
            onSelect={onSelect}
          />
        ) : tab === 'hierarchies' ? (
          <SemanticHierarchiesPanel
            embedded
            draft={draft}
            selected={selected}
            canWrite={canWrite}
            onDraftChange={onDraftChange}
            onSelect={onSelect}
          />
        ) : (
          <SemanticPreAggregationsPanel
            embedded
            draft={draft}
            selected={selected}
            canWrite={canWrite}
            onDraftChange={onDraftChange}
            onSelect={onSelect}
          />
        )}
      </div>
    </aside>
  );
}
