import type { SemanticCubeDefinition, SemanticDimension, SemanticMeasure } from '@sellerpool/core';
import {
  buildMemberPreviewQuery,
  semanticCubeLabel,
  semanticCubeNodeId,
  semanticMemberLabel,
  semanticSourceNodeId,
} from '@sellerpool/core';
import { Hash, Text, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';

import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateDimension, updateMeasure } from '@/lib/semantic-cube-draft';
import {
  DIMENSION_TYPE_LABELS,
  GRANULARITY_LABELS,
  MEASURE_AGGREGATION_LABELS,
  MEASURE_FORMAT_LABELS,
  PALETTE_DIMENSION_LABEL,
  PALETTE_MEASURE_LABEL,
} from '@/lib/semantic-labels';
import { usePreviewSemanticQuery } from '@/hooks/use-semantic';

export type SemanticInspectorNodeId = string;

function ColumnDatalist({ columns }: { columns: string[] }) {
  return (
    <datalist id="semantic-column-options">
      {columns.map((column) => (
        <option key={column} value={column} />
      ))}
    </datalist>
  );
}

function SemanticMemberPreview({
  draft,
  selected,
  sourceNodeId,
  cubeNodeId,
  widgetCount,
}: {
  draft: SemanticCubeDefinition;
  selected: SemanticInspectorNodeId;
  sourceNodeId: string;
  cubeNodeId: string;
  widgetCount: number;
}) {
  const previewQuery = usePreviewSemanticQuery();
  const queryObject = buildMemberPreviewQuery(draft, selected, sourceNodeId, cubeNodeId);
  const [queryText, setQueryText] = useState(JSON.stringify(queryObject, null, 2));
  const [sampleValue, setSampleValue] = useState('—');

  useEffect(() => {
    setQueryText(JSON.stringify(queryObject, null, 2));
  }, [queryObject]);

  const memberName =
    draft.measures.find((item) => item.id === selected)?.name ??
    draft.dimensions.find((item) => item.id === selected)?.name ??
    (selected === cubeNodeId ? draft.name : selected === sourceNodeId ? draft.source.table : '');

  const runPreview = async () => {
    try {
      const parsed = JSON.parse(queryText) as Record<string, unknown>;
      const result = await previewQuery.mutateAsync(parsed);
      setSampleValue(result.sampleValue);
    } catch {
      setSampleValue('ошибка');
    }
  };

  return (
    <div className="semantic-preview">
      <div className="semantic-preview__head">
        <span>Проверка данных</span>
        <Button variant="outline" size="sm" type="button" onClick={runPreview} disabled={previewQuery.isPending}>
          {previewQuery.isPending ? 'Загрузка…' : 'Показать пример'}
        </Button>
      </div>
      <div className="semantic-preview__body">
        {memberName ? (
          <p className="semantic-preview__member">
            {selected === sourceNodeId ? memberName : `${draft.name}.${memberName}`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Выберите показатель или разрез на графе.</p>
        )}
        <dl className="semantic-preview__meta-list">
          <div>
            <dt>Пример значения</dt>
            <dd className="semantic-preview__sample">{sampleValue}</dd>
          </div>
        </dl>
        <details className="semantic-panel__details semantic-preview__details">
          <summary>Технический запрос</summary>
          <p className="m-0 text-xs text-muted-foreground">Для отладки — обычно не нужен.</p>
          <textarea
            className="semantic-preview__query"
            value={queryText}
            spellCheck={false}
            onChange={(event) => setQueryText(event.target.value)}
          />
        </details>
        <ul className="semantic-preview__links m-0 list-none p-0">
          <li>
            <Link to="/dashboards">
              {widgetCount === 0
                ? 'Добавить в дашборд →'
                : `Используется в ${widgetCount} виджетах →`}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

interface SemanticCubeInspectorProps {
  draft: SemanticCubeDefinition;
  selected: SemanticInspectorNodeId;
  canWrite: boolean;
  connectionLabel: string;
  widgetCount: number;
  embedded?: boolean;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
  onAddMeasure: () => void;
  onAddDimension: () => void;
  onDeleteMeasure?: (id: string) => void;
  onDeleteDimension?: (id: string) => void;
}

export function SemanticCubeInspector({
  draft,
  selected,
  canWrite,
  connectionLabel,
  widgetCount,
  embedded = false,
  onDraftChange,
  onAddMeasure,
  onAddDimension,
  onDeleteMeasure,
  onDeleteDimension,
}: SemanticCubeInspectorProps) {
  const sourceNodeId = semanticSourceNodeId(draft.source.table);
  const cubeNodeId = semanticCubeNodeId(draft.name);

  let panel: ReactNode = null;

  if (selected === cubeNodeId) {
    panel = (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Куб · {semanticCubeLabel(draft)}</h2>
          <p className="semantic-panel__desc">Собирает показатели и разрезы — именно это видно в дашбордах</p>
        </div>
        <div className="form-fields max-w-none">
          <FormField label="Название в интерфейсе" hint="Как куб называется в списках и настройках.">
            <Input
              value={draft.displayTitle}
              disabled={!canWrite}
              onChange={(event) => onDraftChange({ ...draft, displayTitle: event.target.value })}
            />
          </FormField>
          <FormField label="Короткое название" hint="Для узких мест в виджетах и на мобильных.">
            <Input
              value={draft.displayShortTitle ?? ''}
              disabled={!canWrite}
              placeholder={draft.displayTitle}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  displayShortTitle: event.target.value.trim() || undefined,
                })
              }
            />
          </FormField>
          <FormField label="Описание" hint="Необязательно — помогает команде понять, что внутри куба.">
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px]"
              value={draft.description ?? ''}
              disabled={!canWrite}
              onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
            />
          </FormField>
          <FormField label="Таблица-источник">
            <p className="m-0 text-[13px] text-muted-foreground">
              {draft.source.table} · {connectionLabel}
            </p>
          </FormField>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={onAddMeasure}>
                <Hash size={14} />
                {PALETTE_MEASURE_LABEL}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onAddDimension}>
                <Text size={14} />
                {PALETTE_DIMENSION_LABEL}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    );
  } else if (selected === 'measure:new') {
    panel = (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Новый показатель</h2>
          <p className="semantic-panel__desc">Число для графика: выручка, количество, средний чек</p>
        </div>
        <Button type="button" size="sm" disabled={!canWrite} onClick={onAddMeasure}>
          Добавить показатель
        </Button>
      </div>
    );
  } else if (selected === 'dimension:new') {
    panel = (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Новый разрез</h2>
          <p className="semantic-panel__desc">По чему делить цифры: дата, статус, регион, товар</p>
        </div>
        <Button type="button" size="sm" disabled={!canWrite} onClick={onAddDimension}>
          Добавить разрез
        </Button>
      </div>
    );
  } else {
    const measure = draft.measures.find((item) => item.id === selected);
    if (measure) {
      panel = (
        <div className="semantic-panel">
          <div className="semantic-panel__head">
            <h2 className="semantic-panel__title">Показатель · {semanticMemberLabel(measure)}</h2>
            <p className="semantic-panel__desc">{measure.description ?? measure.title}</p>
          </div>
          <div className="form-fields max-w-none">
            <FormField label="Системный код">
              <Input value={measure.name} disabled />
            </FormField>
            <FormField label="Название в дашборде">
              <Input
                data-tour="cube-inspector-title"
                value={measure.title}
                disabled={!canWrite}
                onChange={(event) =>
                  onDraftChange(updateMeasure(draft, measure.id, { title: event.target.value }))
                }
              />
            </FormField>
            <FormField label="Короткое название">
              <Input
                value={measure.shortTitle ?? ''}
                disabled={!canWrite}
                placeholder={measure.title}
                onChange={(event) =>
                  onDraftChange(
                    updateMeasure(draft, measure.id, {
                      shortTitle: event.target.value.trim() || undefined,
                    })
                  )
                }
              />
            </FormField>
            <FormField label="Колонка в таблице">
              <Input
                value={measure.sql}
                disabled={!canWrite}
                list="semantic-column-options"
                onChange={(event) =>
                  onDraftChange(updateMeasure(draft, measure.id, { sql: event.target.value }))
                }
              />
            </FormField>
            <FormField label="Как считать">
              <select
                className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                value={measure.type}
                disabled={!canWrite}
                onChange={(event) =>
                  onDraftChange(
                    updateMeasure(draft, measure.id, {
                      type: event.target.value as SemanticMeasure['type'],
                    })
                  )
                }
              >
                {Object.entries(MEASURE_AGGREGATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Формат числа">
              <select
                className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                value={measure.format ?? ''}
                disabled={!canWrite}
                onChange={(event) =>
                  onDraftChange(
                    updateMeasure(draft, measure.id, {
                      format: (event.target.value || undefined) as SemanticMeasure['format'],
                    })
                  )
                }
              >
                <option value="">—</option>
                {Object.entries(MEASURE_FORMAT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {canWrite && draft.measures.length > 1 ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="text-destructive"
              onClick={() => onDeleteMeasure?.(measure.id)}
            >
              <Trash2 size={14} />
              Удалить показатель
            </Button>
          ) : null}
        </div>
      );
    } else {
      const dimension = draft.dimensions.find((item) => item.id === selected);
      if (dimension) {
        panel = (
          <div className="semantic-panel">
            <div className="semantic-panel__head">
              <h2 className="semantic-panel__title">Разрез · {semanticMemberLabel(dimension)}</h2>
              <p className="semantic-panel__desc">{dimension.description ?? dimension.title}</p>
            </div>
            <div className="form-fields max-w-none">
              <FormField label="Системный код">
                <Input value={dimension.name} disabled />
              </FormField>
              <FormField label="Название в дашборде">
                <Input
                  value={dimension.title}
                  disabled={!canWrite || dimension.locked}
                  onChange={(event) =>
                    onDraftChange(updateDimension(draft, dimension.id, { title: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="Короткое название">
                <Input
                  value={dimension.shortTitle ?? ''}
                  disabled={!canWrite || dimension.locked}
                  placeholder={dimension.title}
                  onChange={(event) =>
                    onDraftChange(
                      updateDimension(draft, dimension.id, {
                        shortTitle: event.target.value.trim() || undefined,
                      })
                    )
                  }
                />
              </FormField>
              <FormField label="Колонка в таблице">
                <Input
                  value={dimension.sql}
                  disabled={!canWrite || dimension.locked}
                  list="semantic-column-options"
                  onChange={(event) =>
                    onDraftChange(updateDimension(draft, dimension.id, { sql: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="Тип данных">
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                  value={dimension.type}
                  disabled={!canWrite || dimension.locked}
                  onChange={(event) =>
                    onDraftChange(
                      updateDimension(draft, dimension.id, {
                        type: event.target.value as SemanticDimension['type'],
                      })
                    )
                  }
                >
                  {Object.entries(DIMENSION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
              {dimension.type === 'time' ? (
                <FormField label="Шаг по времени">
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                    value={dimension.granularity ?? 'day'}
                    disabled={!canWrite}
                    onChange={(event) =>
                      onDraftChange(
                        updateDimension(draft, dimension.id, {
                          granularity: event.target.value as SemanticDimension['granularity'],
                        })
                      )
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
            </div>
            {dimension.locked ? (
              <p className="text-xs text-muted-foreground">Системный разрез нельзя удалить.</p>
            ) : canWrite &&
              draft.dimensions.filter((item) => !item.locked).length > 0 &&
              draft.dimensions.length > 1 ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="text-destructive"
                onClick={() => onDeleteDimension?.(dimension.id)}
              >
                <Trash2 size={14} />
                Удалить разрез
              </Button>
            ) : null}
          </div>
        );
      }
    }
  }

  const content = panel ? (
    <div data-canvas-entity={selected}>
      {panel}
      <SemanticMemberPreview
        draft={draft}
        selected={selected}
        sourceNodeId={sourceNodeId}
        cubeNodeId={cubeNodeId}
        widgetCount={widgetCount}
      />
    </div>
  ) : (
    <p className="m-0 text-sm text-muted-foreground">Выберите куб, показатель или разрез на графе.</p>
  );

  if (embedded) {
    return (
      <>
        {content}
        <ColumnDatalist columns={draft.source.columns} />
      </>
    );
  }

  return (
    <aside className="semantic-ide__inspector" data-tour="cube-inspector">
      <div className="semantic-ide__inspector-scroll">{content}</div>
      <ColumnDatalist columns={draft.source.columns} />
    </aside>
  );
}
