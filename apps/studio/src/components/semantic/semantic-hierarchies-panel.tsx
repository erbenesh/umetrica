import type { SemanticCubeDefinition, SemanticHierarchy } from '@umetrica/core';
import { semanticMemberLabel } from '@umetrica/core';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

import { DocCallout } from '@/components/doc/doc-callout';
import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SemanticHierarchiesPanelProps {
  draft: SemanticCubeDefinition;
  canWrite: boolean;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
}

function nextHierarchyName(existing: string[]) {
  let index = 1;
  while (existing.includes(`hierarchy_${index}`)) {
    index += 1;
  }
  return `hierarchy_${index}`;
}

function moveLevel(levels: string[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= levels.length) return levels;
  const next = [...levels];
  [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
  return next;
}

export function SemanticHierarchiesPanel({
  draft,
  canWrite,
  onDraftChange,
}: SemanticHierarchiesPanelProps) {
  const hierarchies = draft.hierarchies ?? [];
  const dimensionNames = draft.dimensions.map((dimension) => dimension.name);
  const canAddHierarchy = dimensionNames.length >= 2;

  const updateHierarchy = (id: string, patch: Partial<SemanticHierarchy>) => {
    onDraftChange({
      ...draft,
      hierarchies: hierarchies.map((hierarchy) =>
        hierarchy.id === id ? { ...hierarchy, ...patch } : hierarchy
      ),
    });
  };

  const addHierarchy = () => {
    if (!canAddHierarchy) return;

    const name = nextHierarchyName(hierarchies.map((item) => item.name));
    const levels = dimensionNames.slice(0, 2);
    const nextHierarchy: SemanticHierarchy = {
      id: `hierarchy:${name}`,
      name,
      title: name.replace(/_/g, ' '),
      levels,
    };
    onDraftChange({ ...draft, hierarchies: [...hierarchies, nextHierarchy] });
  };

  const removeHierarchy = (id: string) => {
    onDraftChange({
      ...draft,
      hierarchies: hierarchies.filter((hierarchy) => hierarchy.id !== id),
    });
  };

  const updateLevel = (hierarchyId: string, levelIndex: number, dimensionName: string) => {
    const hierarchy = hierarchies.find((item) => item.id === hierarchyId);
    if (!hierarchy) return;

    const levels = [...hierarchy.levels];
    levels[levelIndex] = dimensionName;
    updateHierarchy(hierarchyId, { levels });
  };

  const addLevel = (hierarchyId: string) => {
    const hierarchy = hierarchies.find((item) => item.id === hierarchyId);
    if (!hierarchy) return;

    const unused = dimensionNames.find((name) => !hierarchy.levels.includes(name));
    if (!unused) return;

    updateHierarchy(hierarchyId, { levels: [...hierarchy.levels, unused] });
  };

  const removeLevel = (hierarchyId: string, levelIndex: number) => {
    const hierarchy = hierarchies.find((item) => item.id === hierarchyId);
    if (!hierarchy || hierarchy.levels.length <= 2) return;

    updateHierarchy(hierarchyId, {
      levels: hierarchy.levels.filter((_, index) => index !== levelIndex),
    });
  };

  return (
    <div className="semantic-relationships-page">
      <div className="semantic-panel max-w-3xl">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Иерархии</h2>
          <p className="semantic-panel__desc">
            Drill-down пути по измерениям куба — от общего к детальному.
          </p>
        </div>

        <DocCallout variant="info">
          Уровни идут слева направо: наименее детальный → наиболее детальный. В Cube.js query
          используйте <code className="text-xs">dimensions</code> из иерархии для drill-down.
        </DocCallout>

        {!canAddHierarchy ? (
          <p className="text-sm text-muted-foreground">
            Для иерархии нужно минимум 2 измерения в кубе.
          </p>
        ) : null}

        {hierarchies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Иерархий пока нет.</p>
        ) : (
          <div className="form-fields max-w-none">
            {hierarchies.map((hierarchy) => (
              <div key={hierarchy.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {semanticMemberLabel({ ...hierarchy, title: hierarchy.title ?? hierarchy.name })}
                  </span>
                  {canWrite ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      className="text-destructive"
                      aria-label="Удалить иерархию"
                      onClick={() => removeHierarchy(hierarchy.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  ) : null}
                </div>
                <div className="form-fields max-w-none">
                  <FormField label="Имя">
                    <Input
                      value={hierarchy.name}
                      disabled={!canWrite}
                      onChange={(event) => {
                        const name = event.target.value.replace(/[^a-zA-Z0-9_]/g, '_');
                        updateHierarchy(hierarchy.id, { name });
                      }}
                    />
                  </FormField>
                  <FormField label="Заголовок">
                    <Input
                      value={hierarchy.title ?? ''}
                      disabled={!canWrite}
                      onChange={(event) => updateHierarchy(hierarchy.id, { title: event.target.value })}
                    />
                  </FormField>
                  <FormField label="Краткий заголовок">
                    <Input
                      value={hierarchy.shortTitle ?? ''}
                      disabled={!canWrite}
                      placeholder={hierarchy.title ?? hierarchy.name}
                      onChange={(event) =>
                        updateHierarchy(hierarchy.id, {
                          shortTitle: event.target.value.trim() || undefined,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="Уровни (от общего к детальному)">
                    <div className="flex flex-col gap-2">
                      {hierarchy.levels.map((level, levelIndex) => (
                        <div key={`${hierarchy.id}-${levelIndex}`} className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
                            {levelIndex + 1}
                          </span>
                          <select
                            className="flex h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2.5 text-[13px]"
                            value={level}
                            disabled={!canWrite}
                            onChange={(event) =>
                              updateLevel(hierarchy.id, levelIndex, event.target.value)
                            }
                          >
                            {draft.dimensions.map((dimension) => (
                              <option key={dimension.name} value={dimension.name}>
                                {semanticMemberLabel(dimension)}
                              </option>
                            ))}
                          </select>
                          {canWrite ? (
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                type="button"
                                aria-label="Выше"
                                disabled={levelIndex === 0}
                                onClick={() =>
                                  updateHierarchy(hierarchy.id, {
                                    levels: moveLevel(hierarchy.levels, levelIndex, -1),
                                  })
                                }
                              >
                                <ChevronUp size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                type="button"
                                aria-label="Ниже"
                                disabled={levelIndex === hierarchy.levels.length - 1}
                                onClick={() =>
                                  updateHierarchy(hierarchy.id, {
                                    levels: moveLevel(hierarchy.levels, levelIndex, 1),
                                  })
                                }
                              >
                                <ChevronDown size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                type="button"
                                className="text-destructive"
                                aria-label="Удалить уровень"
                                disabled={hierarchy.levels.length <= 2}
                                onClick={() => removeLevel(hierarchy.id, levelIndex)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </FormField>
                  {canWrite && hierarchy.levels.length < dimensionNames.length ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addLevel(hierarchy.id)}
                    >
                      <Plus size={14} />
                      Добавить уровень
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {canWrite ? (
          <Button
            type="button"
            size="sm"
            disabled={!canAddHierarchy}
            onClick={addHierarchy}
          >
            <Plus size={14} />
            Добавить иерархию
          </Button>
        ) : null}
      </div>
    </div>
  );
}
