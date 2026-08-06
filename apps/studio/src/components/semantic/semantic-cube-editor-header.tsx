import { ChevronRight, CircleHelp, Loader2, PanelLeftClose, Redo2, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { SEMANTIC_CUBE_ADVANCED_TABS } from '@/lib/semantic-guide';
import { SEMANTIC_CUBE_TAB_LABELS } from '@/lib/semantic-labels';
import { cn } from '@/lib/utils';

export type SemanticCubeEditorTab =
  | 'visual'
  | 'relationships'
  | 'segments'
  | 'hierarchies'
  | 'rollups'
  | 'yaml';

const TABS: SemanticCubeEditorTab[] = [
  'visual',
  'relationships',
  'segments',
  'hierarchies',
  'rollups',
  'yaml',
];

interface SemanticCubeEditorHeaderProps {
  cubeName: string;
  cubeLabel: string;
  tab: SemanticCubeEditorTab;
  isDraft: boolean;
  canWrite: boolean;
  savedHint: boolean;
  isSaving: boolean;
  isDiscarding: boolean;
  onTabChange: (tab: SemanticCubeEditorTab) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
  onPublish: () => void;
  tourActive?: boolean;
  onStartTour?: () => void;
  onClose?: () => void;
  panel?: boolean;
  shell?: boolean;
}

export function SemanticCubeEditorHeader({
  cubeName,
  cubeLabel,
  tab,
  isDraft,
  canWrite,
  savedHint,
  isSaving,
  isDiscarding,
  onTabChange,
  onUndo,
  onRedo,
  onDiscard,
  onPublish,
  tourActive = false,
  onStartTour,
  onClose,
  panel = false,
  shell = false,
}: SemanticCubeEditorHeaderProps) {
  return (
    <header className={cn('semantic-cube-header', panel && 'semantic-cube-header--panel', shell && 'semantic-cube-header--shell')}>
      <div className="semantic-cube-header__row semantic-cube-header__row--desktop">
        <div className="semantic-cube-header__leading">
          {onClose ? (
            <div className="semantic-cube-header__crumb">
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
              <span className="semantic-cube-header__name" title={cubeName}>
                {cubeLabel}
              </span>
            </div>
          ) : (
            <nav className="semantic-cube-header__crumb" aria-label="Навигация">
              <Link to="/semantic">Семантика</Link>
              <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} aria-hidden />
              <span className="semantic-cube-header__name" title={cubeName}>
                {cubeLabel}
              </span>
            </nav>
          )}
          <span
            className={cn(
              'db-tag',
              isDraft ? 'db-tag--blue' : 'db-tag--green',
              'semantic-cube-header__status'
            )}
          >
            {isDraft ? 'Черновик' : 'Опубликован'}
          </span>
          {savedHint ? (
            <span className="semantic-cube-header__hint">Сохранено</span>
          ) : isSaving ? (
            <span className="semantic-cube-header__hint semantic-cube-header__hint--pending">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Сохранение…
            </span>
          ) : null}
        </div>

        {canWrite ? (
          <div className="semantic-cube-header__actions">
            <div className="semantic-cube-header__history" role="group" aria-label="История правок">
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

      <div className="semantic-cube-header__row semantic-cube-header__row--tabs">
        <div
          className="semantic-cube-header__tabs"
          role="tablist"
          aria-label="Разделы редактора куба"
          data-tour="cube-tabs"
        >
          {TABS.map((item) => {
            const isAdvanced = SEMANTIC_CUBE_ADVANCED_TABS.includes(item);
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                data-tour={`cube-tab-${item}`}
                className={cn(
                  'semantic-cube-header__tab',
                  tab === item && 'is-active',
                  isAdvanced && 'semantic-cube-header__tab--advanced'
                )}
                onClick={() => onTabChange(item)}
              >
                {SEMANTIC_CUBE_TAB_LABELS[item]}
              </button>
            );
          })}
        </div>
        {onStartTour ? (
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            data-tour="cube-help"
            className={cn('semantic-cube-header__help', tourActive && 'is-active')}
            aria-label="Обучение"
            title="Обучение"
            aria-pressed={tourActive}
            onClick={onStartTour}
          >
            <CircleHelp size={16} />
          </Button>
        ) : null}
      </div>
    </header>
  );
}
