import type { SemanticCubeDefinition, SemanticPreAggregation } from '@sellerpool/core';
import { semanticMemberLabel } from '@sellerpool/core';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';

import { DocCallout } from '@/components/doc/doc-callout';
import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SemanticPreAggregationsPanelProps {
  draft: SemanticCubeDefinition;
  canWrite: boolean;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
}

const REFRESH_EVERY_PRESETS = ['', '10 second', '1 hour', '1 day', '1 week'] as const;

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
  onDraftChange,
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
  };

  const removePreAggregation = (id: string) => {
    onDraftChange({
      ...draft,
      preAggregations: preAggregations.filter((preAgg) => preAgg.id !== id),
    });
  };

  return (
    <div className="semantic-relationships-page">
      <div className="semantic-panel max-w-3xl">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Pre-aggregations</h2>
          <p className="semantic-panel__desc">
            Rollup-таблицы для ускорения запросов. Cube материализует выбранные меры и измерения.
          </p>
        </div>

        <DocCallout variant="info">
          После publish Cube подхватывает <code className="text-xs">pre_aggregations</code> из YAML.
          В dev <code className="text-xs">docker compose up -d</code> поднимает Cube Store и refresh
          worker для фоновой сборки. Статус rollups — в{' '}
          <a
            className="inline-flex items-center gap-1 text-primary hover:underline"
            href="http://localhost:4000"
            target="_blank"
            rel="noreferrer"
          >
            Cube Playground
            <ExternalLink size={12} />
          </a>
          . Если meta не обновилась:{' '}
          <code className="text-xs">docker compose restart cube cube_refresh_worker</code>.
        </DocCallout>

        {preAggregations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pre-aggregations пока нет.</p>
        ) : (
          <div className="form-fields max-w-none">
            {preAggregations.map((preAgg) => {
              const refreshEvery = preAgg.refreshKey?.every ?? '';
              const refreshPreset = REFRESH_EVERY_PRESETS.includes(
                refreshEvery as (typeof REFRESH_EVERY_PRESETS)[number]
              )
                ? refreshEvery
                : refreshEvery
                  ? '__custom__'
                  : '';

              return (
                <div key={preAgg.id} className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{preAgg.name}</span>
                    {canWrite ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        className="text-destructive"
                        aria-label="Удалить pre-aggregation"
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

                    <FormField label="Меры">
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

                    <FormField label="Измерения">
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

                    <FormField label="Time dimension">
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
                        <option value="">— без time dimension —</option>
                        {timeDimensions.map((dimension) => (
                          <option key={dimension.id} value={dimension.name}>
                            {semanticMemberLabel(dimension)}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    {preAgg.timeDimension ? (
                      <FormField label="Granularity">
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
                          <option value="day">day</option>
                          <option value="week">week</option>
                          <option value="month">month</option>
                          <option value="year">year</option>
                        </select>
                      </FormField>
                    ) : null}

                    <FormField label="Refresh key · every">
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
                          <option value="">По умолчанию Cube</option>
                          <option value="10 second">10 second</option>
                          <option value="1 hour">1 hour</option>
                          <option value="1 day">1 day</option>
                          <option value="1 week">1 week</option>
                          <option value="__custom__">Своё значение</option>
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

                    <FormField label="Refresh key · SQL (опционально)">
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
            Добавить pre-aggregation
          </Button>
        ) : null}
      </div>
    </div>
  );
}
