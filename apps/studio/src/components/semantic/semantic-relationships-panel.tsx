import type { SemanticCubeDefinition, SemanticJoin } from '@sellerpool/core';
import { buildSuggestedJoinSql, semanticCubeLabel, semanticJoinId } from '@sellerpool/core';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { DocCallout } from '@/components/doc/doc-callout';
import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TOUR_DEMO_JOIN_SUFFIX } from '@/lib/semantic-cube-tour-demo';
import { JOIN_RELATIONSHIP_LABELS } from '@/lib/semantic-labels';
import { cn } from '@/lib/utils';
import { useCubeJoinContext, useSemanticForeignKeys } from '@/hooks/use-semantic';

interface SemanticRelationshipsPanelProps {
  draft: SemanticCubeDefinition;
  canWrite: boolean;
  joinTarget?: string;
  selected?: string;
  embedded?: boolean;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
  onSelect?: (id: string) => void;
}

export function SemanticRelationshipsPanel({
  draft,
  canWrite,
  joinTarget,
  selected,
  embedded = false,
  onDraftChange,
  onSelect,
}: SemanticRelationshipsPanelProps) {
  const { data: joinContext } = useCubeJoinContext();
  const { data: foreignKeys, isLoading } = useSemanticForeignKeys(draft.source.connectionId);

  const otherCubes = useMemo(
    () => (joinContext?.cubes ?? []).filter((cube) => cube.name !== draft.name),
    [joinContext?.cubes, draft.name]
  );

  const joins = draft.joins ?? [];
  const appliedJoinTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!joinTarget || !canWrite) return;
    if (appliedJoinTargetRef.current === joinTarget) return;
    if (joins.some((join) => join.targetCube === joinTarget)) {
      appliedJoinTargetRef.current = joinTarget;
      return;
    }

    const fk = foreignKeys?.items.find(
      (item) =>
        item.fromTable === draft.source.table &&
        item.toTable.includes(joinTarget.toLowerCase())
    );

    const nextJoin: SemanticJoin = {
      id: semanticJoinId(draft.name, joinTarget),
      targetCube: joinTarget,
      relationship: 'belongsTo',
      sql:
        fk?.suggestedSql ??
        buildSuggestedJoinSql(draft.name, 'id', joinTarget, `${joinTarget.toLowerCase()}_id`),
    };

    appliedJoinTargetRef.current = joinTarget;
    onDraftChange({ ...draft, joins: [...joins, nextJoin] });
    onSelect?.(nextJoin.id);
  }, [joinTarget, canWrite, draft, foreignKeys?.items, joins, onDraftChange, onSelect]);

  const updateJoin = (id: string, patch: Partial<SemanticJoin>) => {
    onDraftChange({
      ...draft,
      joins: joins.map((join) => (join.id === id ? { ...join, ...patch } : join)),
    });
  };

  const addJoin = () => {
    const target = otherCubes[0]?.name;
    if (!target) return;

    const nextJoin: SemanticJoin = {
      id: semanticJoinId(draft.name, target),
      targetCube: target,
      relationship: 'belongsTo',
      sql: buildSuggestedJoinSql(draft.name, 'id', target, `${target.toLowerCase()}_id`),
    };

    onDraftChange({ ...draft, joins: [...joins, nextJoin] });
    onSelect?.(nextJoin.id);
  };

  const removeJoin = (id: string) => {
    onDraftChange({ ...draft, joins: joins.filter((join) => join.id !== id) });
  };

  const suggestFromFk = (join: SemanticJoin) => {
    const fk = foreignKeys?.items.find(
      (item) =>
        item.fromTable === draft.source.table &&
        item.toTable.toLowerCase().includes(join.targetCube.toLowerCase())
    );
    if (!fk) return;
    updateJoin(join.id, { sql: fk.suggestedSql });
  };

  return (
    <div className={cn('semantic-relationships-page', embedded && 'semantic-relationships-page--embedded')}>
      <div className="semantic-panel" data-tour="cube-relationships-panel">
        {!embedded ? (
          <div className="semantic-panel__head">
            <h2 className="semantic-panel__title">Связи · {semanticCubeLabel(draft)}</h2>
            <p className="semantic-panel__desc">
              Объединяют данные из разных кубов — например, заказы и товары в одном отчёте
            </p>
          </div>
        ) : (
          <p className="semantic-panel__desc semantic-panel__desc--compact">
            Объединяют данные из разных кубов. Выберите связь на графе или добавьте ниже.
          </p>
        )}

      <DocCallout variant="info" className={embedded ? 'semantic-panel__callout--compact' : undefined}>
        Нужны только если цифры лежат в разных таблицах. Для одного куба из одной таблицы можно
        пропустить этот шаг.
      </DocCallout>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Загрузка внешних ключей…
        </p>
      ) : null}

      <div className="semantic-relationships__list">
        {joins.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Связей пока нет. Добавьте, если нужно подтянуть поля из другого куба.
          </p>
        ) : (
          joins.map((join) => (
            <div
              key={join.id}
              data-canvas-entity={join.id}
              className={cn(
                'semantic-relationships__item semantic-panel-entity',
                selected === join.id && 'is-active'
              )}
              data-tour={join.id.endsWith(TOUR_DEMO_JOIN_SUFFIX) ? 'cube-relationships-demo' : undefined}
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest('button, input, select, textarea, summary, a, label')) return;
                onSelect?.(join.id);
              }}
            >
              <div className="form-fields max-w-none">
                <FormField label="Связанный куб" hint="Откуда подтянуть дополнительные поля.">
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                    value={join.targetCube}
                    disabled={!canWrite}
                    onChange={(event) =>
                      updateJoin(join.id, {
                        targetCube: event.target.value,
                        id: semanticJoinId(draft.name, event.target.value),
                      })
                    }
                  >
                    {otherCubes.map((cube) => (
                      <option key={cube.name} value={cube.name}>
                        {semanticCubeLabel(cube)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Тип связи" hint="Как строки одной таблицы соотносятся с другой.">
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                    value={join.relationship}
                    disabled={!canWrite}
                    onChange={(event) =>
                      updateJoin(join.id, {
                        relationship: event.target.value as SemanticJoin['relationship'],
                      })
                    }
                  >
                    {Object.entries(JOIN_RELATIONSHIP_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <details className="semantic-panel__details">
                  <summary>Условие связи (SQL)</summary>
                  <FormField label="SQL" hint="Обычно подставляется автоматически из внешних ключей базы.">
                    <textarea
                      className="flex min-h-[64px] w-full rounded-md border border-input bg-card px-2.5 py-2 font-mono text-[12px]"
                      value={join.sql}
                      disabled={!canWrite}
                      onChange={(event) => updateJoin(join.id, { sql: event.target.value })}
                    />
                  </FormField>
                </details>
              </div>
              {canWrite ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => suggestFromFk(join)}>
                    Предложить из внешних ключей
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="text-destructive"
                    onClick={() => removeJoin(join.id)}
                  >
                    <Trash2 size={14} />
                    Удалить
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {canWrite ? (
        <Button type="button" size="sm" disabled={otherCubes.length === 0} onClick={addJoin}>
          <Plus size={14} />
          Добавить связь
        </Button>
      ) : null}
      </div>
    </div>
  );
}
