import type { SemanticCubeDefinition, SemanticJoin } from '@sellerpool/core';
import { buildSuggestedJoinSql, semanticCubeLabel, semanticJoinId } from '@sellerpool/core';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCubeJoinContext, useSemanticForeignKeys } from '@/hooks/use-semantic';

interface SemanticRelationshipsPanelProps {
  draft: SemanticCubeDefinition;
  canWrite: boolean;
  joinTarget?: string;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
}

export function SemanticRelationshipsPanel({
  draft,
  canWrite,
  joinTarget,
  onDraftChange,
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
  }, [joinTarget, canWrite, draft, foreignKeys?.items, joins, onDraftChange]);

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
    <div className="semantic-panel semantic-relationships">
      <div className="semantic-panel__head">
        <h2 className="semantic-panel__title">Relationships · {semanticCubeLabel(draft)}</h2>
        <p className="semantic-panel__desc">Joins к другим кубам на data graph</p>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Загрузка FK...
        </p>
      ) : null}

      <div className="semantic-relationships__list">
        {joins.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет joins. Добавьте связь с другим кубом.</p>
        ) : (
          joins.map((join) => (
            <div key={join.id} className="semantic-relationships__item">
              <div className="form-fields max-w-none">
                <FormField label="Целевой куб">
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
                <FormField label="Тип">
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
                    <option value="belongsTo">belongsTo</option>
                    <option value="hasMany">hasMany</option>
                    <option value="hasOne">hasOne</option>
                  </select>
                </FormField>
                <FormField label="SQL">
                  <textarea
                    className="flex min-h-[64px] w-full rounded-md border border-input bg-card px-2.5 py-2 font-mono text-[12px]"
                    value={join.sql}
                    disabled={!canWrite}
                    onChange={(event) => updateJoin(join.id, { sql: event.target.value })}
                  />
                </FormField>
              </div>
              {canWrite ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => suggestFromFk(join)}>
                    Предложить из FK
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
          Добавить join
        </Button>
      ) : null}
    </div>
  );
}
