import { ChevronRight, Loader2, Redo2, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SemanticCubeEditorTab =
  | 'visual'
  | 'relationships'
  | 'segments'
  | 'hierarchies'
  | 'rollups'
  | 'yaml';

const TABS: Array<{ id: SemanticCubeEditorTab; label: string }> = [
  { id: 'visual', label: 'Visual' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'segments', label: 'Segments' },
  { id: 'hierarchies', label: 'Hierarchies' },
  { id: 'rollups', label: 'Rollups' },
  { id: 'yaml', label: 'YAML' },
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
}: SemanticCubeEditorHeaderProps) {
  return (
    <header className="semantic-cube-header">
      <div className="semantic-cube-header__row">
        <div className="semantic-cube-header__leading">
          <nav className="semantic-cube-header__crumb" aria-label="Навигация">
            <Link to="/semantic">Семантика</Link>
            <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} aria-hidden />
            <span className="semantic-cube-header__name" title={cubeName}>
              {cubeLabel}
            </span>
          </nav>
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
            <Button size="sm" type="button" onClick={onPublish}>
              Опубликовать
            </Button>
          </div>
        ) : null}
      </div>

      <div className="semantic-cube-header__row semantic-cube-header__row--tabs">
        <div className="semantic-cube-header__tabs" role="tablist" aria-label="Разделы редактора куба">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cn('semantic-cube-header__tab', tab === item.id && 'is-active')}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
