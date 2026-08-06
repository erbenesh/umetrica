import type { SemanticCubeDefinition, SemanticPreAggregation } from '@sellerpool/core';
import { semanticMemberLabel } from '@sellerpool/core';
import { Plus, Trash2 } from 'lucide-react';

import { DocCallout } from '@/components/doc/doc-callout';
import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  GRANULARITY_LABELS,
  REFRESH_EVERY_LABELS,
  REFRESH_EVERY_PRESETS,
} from '@/lib/semantic-labels';

interface SemanticPreAggregationsPanelProps {
  draft: SemanticCubeDefinition;
  canWrite: boolean;
  selected?: string;
  embedded?: boolean;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
  onSelect?: (id: string) => void;
}

const REFRESH_EVERY_PRESET_VALUES = REFRESH_EVERY_PRESETS;

function nextPreAggregationName(existing: string[]) {
  let index = 1;
  while (existing.includes(`rollup_${index}`)) {
    index += 1;
  }
  return `rollup_${index}`;
}

function toggleMember(list: string[], member: string) {
  return list.includes(member) ? list.filter((item) => item !== member) : [...list, member];
}

export function SemanticPreAggregationsPanel({
  draft,
  canWrite,
  selected,
  embedded = false,
  onDraftChange,
  onSelect,
}: SemanticPreAggregationsPanelProps) {
  const preAggregations = draft.preAggregations ?? [];
  const measureNames = draft.measures.map((measure) => measure.name);
  const dimensionNames = draft.dimensions.map((dimension) => dimension.name);
  const timeDimensions = draft.dimensions.filter((dimension) => dimension.type === 'time');

  const updatePreAggregation = (id: string, patch: Partial<SemanticPreAggregation>) => {
    onDraftChange({
      ...draft,
      preAggregations: preAggregations.map((preAgg) =>
        preAgg.id === id ? { ...preAgg, ...patch } : preAgg
      ),
    });
  };

  const addPreAggregation = () => {
    const name = nextPreAggregationName(preAggregations.map((item) => item.name));
    const defaultMeasure = measureNames[0];
    if (!defaultMeasure) return;

    const nextPreAggregation: SemanticPreAggregation = {
      id: `preAgg:${name}`,
      name,
      measures: [defaultMeasure],
      dimensions: [],
    };
    onDraftChange({ ...draft, preAggregations: [...preAggregations, nextPreAggregation] });
    onSelect?.(nextPreAggregation.id);
  };

  const removePreAggregation = (id: string) => {
    onDraftChange({
      ...draft,
      preAggregations: preAggregations.filter((preAgg) => preAgg.id !== id),
    });
  };

  return (
    <div className={cn('semantic-relationships-page', embedded && 'semantic-relationships-page--embedded')}>
      <div className="semantic-panel" data-tour="cube-rollups-panel">
        {!embedded ? (
          <div className="semantic-panel__head">
            <h2 className="semantic-panel__title">Предагрегации</h2>
            <p className="semantic-panel__desc">
              Заранее посчитанная сводка — отдельная таблица с итогами, которую Cube обновляет по
              расписанию
            </p>
          </div>
        ) : (
          <p className="semantic-panel__desc semantic-panel__desc--compact">
            Заранее посчитанные сводки. Выберите на графе или добавьте ниже.
          </p>
        )}

        <DocCallout variant="info" className={embedded ? 'semantic-panel__callout--compact' : undefined}>
          Без предагрегации виджет каждый раз считает из сырых данных в базе. С предагрегацией —
          читает готовую сводку: «выручка по дням», «заказы по товарам» и т. п. Нужно, когда строк
          миллионы и дашборд стал медленным. На старте обычно можно не настраивать.
        </DocCallout>

        {preAggregations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Предагрегаций пока нет.</p>
        ) : (
          <div className="form-fields max-w-none">
            {preAggregations.map((preAgg) => {
              const refreshEvery = preAgg.refreshKey?.every ?? '';
              const refreshPreset = REFRESH_EVERY_PRESET_VALUES.includes(
                refreshEvery as (typeof REFRESH_EVERY_PRESET_VALUES)[number]
              )
                ? refreshEvery
                : refreshEvery
                  ? '__custom__'
                  : '';

              return (
                <div
                  key={preAgg.id}
                  data-canvas-entity={preAgg.id}
                  className={cn(
                    'semantic-panel-entity rounded-lg border border-border p-4',
                    selected === preAgg.id && 'is-active'
                  )}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest('button, input, select, textarea, summary, a, label')) return;
                    onSelect?.(preAgg.id);
                  }}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{preAgg.name}</span>
                    {canWrite ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        className="text-destructive"
                        aria-label="Удалить предагрегацию"
                        onClick={() => removePreAggregation(preAgg.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    ) : null}
                  </div>

                  <div className="form-fields max-w-none">
                    <FormField label="Имя">
                      <Input
                        value={preAgg.name}
                        disabled={!canWrite}
                        onChange={(event) => {
                          const name = event.target.value.replace(/[^a-zA-Z0-9_]/g, '_');
                          updatePreAggregation(preAgg.id, { name });
                        }}
                      />
                    </FormField>

                    <FormField
                      label="Показатели в сводке"
                      hint="Какие цифры заранее посчитать и положить в таблицу-итог."
                    >
                      <div className="flex flex-wrap gap-2">
                        {draft.measures.map((measure) => (
                          <label
                            key={measure.name}
                            className={cn(
                              'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[13px]',
                              preAgg.measures.includes(measure.name)
                                ? 'border-primary bg-primary/10'
                                : 'border-border'
                            )}
                          >
                            <input
                              type="checkbox"
                              className="size-3.5"
                              disabled={!canWrite}
                              checked={preAgg.measures.includes(measure.name)}
                              onChange={() => {
                                const measures = toggleMember(preAgg.measures, measure.name);
                                if (measures.length === 0) return;
                                updatePreAggregation(preAgg.id, { measures });
                              }}
                            />
                            {semanticMemberLabel(measure)}
                          </label>
                        ))}
                      </div>
                    </FormField>

                    <FormField
                      label="Разрезы в сводке"
                      hint="По чему группировать итоги: дата, товар, регион."
                    >
                      <div className="flex flex-wrap gap-2">
                        {dimensionNames.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Нет измерений</span>
                        ) : (
                          draft.dimensions.map((dimension) => (
                            <label
                              key={dimension.name}
                              className={cn(
                                'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[13px]',
                                preAgg.dimensions.includes(dimension.name)
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border'
                              )}
                            >
                              <input
                                type="checkbox"
                                className="size-3.5"
                                disabled={!canWrite}
                                checked={preAgg.dimensions.includes(dimension.name)}
                                onChange={() =>
                                  updatePreAggregation(preAgg.id, {
                                    dimensions: toggleMember(preAgg.dimensions, dimension.name),
                                  })
                                }
                              />
                              {semanticMemberLabel(dimension)}
                            </label>
                          ))
                        )}
                      </div>
                    </FormField>

                    <FormField
                      label="Временной разрез"
                      hint="Если в сводке нужна динамика по датам — выберите поле даты."
                    >
                      <select
                        className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                        value={preAgg.timeDimension ?? ''}
                        disabled={!canWrite || timeDimensions.length === 0}
                        onChange={(event) => {
                          const timeDimension = event.target.value || undefined;
                          updatePreAggregation(preAgg.id, {
                            timeDimension,
                            granularity: timeDimension ? preAgg.granularity ?? 'day' : undefined,
                          });
                        }}
                      >
                        <option value="">— без временного измерения —</option>
                        {timeDimensions.map((dimension) => (
                          <option key={dimension.id} value={dimension.name}>
                            {semanticMemberLabel(dimension)}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    {preAgg.timeDimension ? (
                      <FormField label="Шаг по времени" hint="День, неделя или месяц в готовой сводке.">
                        <select
                          className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                          value={preAgg.granularity ?? 'day'}
                          disabled={!canWrite}
                          onChange={(event) =>
                            updatePreAggregation(preAgg.id, {
                              granularity: event.target.value as SemanticPreAggregation['granularity'],
                            })
                          }
                        >
                          {Object.entries(GRANULARITY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    ) : null}

                    <FormField
                      label="Как часто пересчитывать"
                      hint="Когда Cube заново строит таблицу-итог из свежих данных."
                    >
                      <div className="flex flex-col gap-2">
                        <select
                          className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                          value={refreshPreset}
                          disabled={!canWrite}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === '') {
                              const nextRefresh = preAgg.refreshKey?.sql
                                ? { sql: preAgg.refreshKey.sql }
                                : undefined;
                              updatePreAggregation(preAgg.id, { refreshKey: nextRefresh });
                              return;
                            }
                            if (value === '__custom__') {
                              updatePreAggregation(preAgg.id, {
                                refreshKey: {
                                  ...preAgg.refreshKey,
                                  every: preAgg.refreshKey?.every ?? '1 hour',
                                },
                              });
                              return;
                            }
                            updatePreAggregation(preAgg.id, {
                              refreshKey: {
                                ...preAgg.refreshKey,
                                every: value,
                              },
                            });
                          }}
                        >
                          <option value="">{REFRESH_EVERY_LABELS['']}</option>
                          <option value="10 second">{REFRESH_EVERY_LABELS['10 second']}</option>
                          <option value="1 hour">{REFRESH_EVERY_LABELS['1 hour']}</option>
                          <option value="1 day">{REFRESH_EVERY_LABELS['1 day']}</option>
                          <option value="1 week">{REFRESH_EVERY_LABELS['1 week']}</option>
                          <option value="__custom__">{REFRESH_EVERY_LABELS.__custom__}</option>
                        </select>
                        {refreshPreset === '__custom__' ? (
                          <Input
                            value={refreshEvery}
                            disabled={!canWrite}
                            placeholder="1 hour"
                            onChange={(event) =>
                              updatePreAggregation(preAgg.id, {
                                refreshKey: {
                                  ...preAgg.refreshKey,
                                  every: event.target.value,
                                },
                              })
                            }
                          />
                        ) : null}
                      </div>
                    </FormField>

                    <FormField label="SQL-ключ обновления (опционально)">
                      <textarea
                        className="flex min-h-[56px] w-full rounded-md border border-input bg-card px-2.5 py-2 font-mono text-[12px]"
                        value={preAgg.refreshKey?.sql ?? ''}
                        disabled={!canWrite}
                        placeholder="SELECT MAX(updated_at) FROM orders"
                        onChange={(event) => {
                          const sql = event.target.value.trim();
                          const nextRefresh =
                            sql || preAgg.refreshKey?.every
                              ? {
                                  ...(preAgg.refreshKey?.every
                                    ? { every: preAgg.refreshKey.every }
                                    : {}),
                                  ...(sql ? { sql } : {}),
                                }
                              : undefined;
                          updatePreAggregation(preAgg.id, { refreshKey: nextRefresh });
                        }}
                      />
                    </FormField>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canWrite ? (
          <Button type="button" size="sm" disabled={measureNames.length === 0} onClick={addPreAggregation}>
            <Plus size={14} />
            Добавить предагрегацию
          </Button>
        ) : null}
      </div>
    </div>
  );
}
