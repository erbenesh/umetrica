import type { SemanticCubeDefinition, SemanticSegment } from '@sellerpool/core';
import { semanticMemberLabel } from '@sellerpool/core';
import { Plus, Trash2 } from 'lucide-react';

import { DocCallout } from '@/components/doc/doc-callout';
import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TOUR_DEMO_SEGMENT_ID } from '@/lib/semantic-cube-tour-demo';
import { cn } from '@/lib/utils';

interface SemanticSegmentsPanelProps {
  draft: SemanticCubeDefinition;
  canWrite: boolean;
  selected?: string;
  embedded?: boolean;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
  onSelect?: (id: string) => void;
}

function nextSegmentName(existing: string[]) {
  let index = 1;
  while (existing.includes(`segment_${index}`)) {
    index += 1;
  }
  return `segment_${index}`;
}

export function SemanticSegmentsPanel({
  draft,
  canWrite,
  selected,
  embedded = false,
  onDraftChange,
  onSelect,
}: SemanticSegmentsPanelProps) {
  const segments = draft.segments ?? [];

  const updateSegment = (id: string, patch: Partial<SemanticSegment>) => {
    onDraftChange({
      ...draft,
      segments: segments.map((segment) => (segment.id === id ? { ...segment, ...patch } : segment)),
    });
  };

  const addSegment = () => {
    const name = nextSegmentName(segments.map((item) => item.name));
    const nextSegment: SemanticSegment = {
      id: `segment:${name}`,
      name,
      title: name.replace(/_/g, ' '),
      sql: '1 = 1',
    };
    onDraftChange({ ...draft, segments: [...segments, nextSegment] });
    onSelect?.(nextSegment.id);
  };

  const removeSegment = (id: string) => {
    onDraftChange({
      ...draft,
      segments: segments.filter((segment) => segment.id !== id),
    });
  };

  return (
    <div className={cn('semantic-relationships-page', embedded && 'semantic-relationships-page--embedded')}>
      <div className="semantic-panel" data-tour="cube-segments-panel">
        {!embedded ? (
          <div className="semantic-panel__head">
            <h2 className="semantic-panel__title">Сегменты</h2>
            <p className="semantic-panel__desc">
              Готовые фильтры: «только оплаченные», «только B2B». На старте обычно хватает фильтров в дашборде.
            </p>
          </div>
        ) : (
          <p className="semantic-panel__desc semantic-panel__desc--compact">
            Готовые фильтры данных. Выберите сегмент на графе или добавьте ниже.
          </p>
        )}

        <DocCallout variant="info" className={embedded ? 'semantic-panel__callout--compact' : undefined}>
          Сегмент сужает данные куба заранее. Если не уверены — пока можно не настраивать.
        </DocCallout>

        {segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Сегментов пока нет.</p>
        ) : (
          <div className="form-fields max-w-none">
            {segments.map((segment) => (
              <div
                key={segment.id}
                data-canvas-entity={segment.id}
                className={cn(
                  'semantic-panel-entity rounded-lg border border-border p-4',
                  selected === segment.id && 'is-active'
                )}
                data-tour={segment.id === TOUR_DEMO_SEGMENT_ID ? 'cube-segments-demo' : undefined}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest('button, input, select, textarea, summary, a, label')) return;
                  onSelect?.(segment.id);
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{semanticMemberLabel({ ...segment, title: segment.title ?? segment.name })}</span>
                  {canWrite ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      className="text-destructive"
                      aria-label="Удалить сегмент"
                      onClick={() => removeSegment(segment.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  ) : null}
                </div>
                <div className="form-fields max-w-none">
                  <FormField label="Имя">
                    <Input
                      value={segment.name}
                      disabled={!canWrite}
                      onChange={(event) => {
                        const name = event.target.value.replace(/[^a-zA-Z0-9_]/g, '_');
                        updateSegment(segment.id, { name });
                      }}
                    />
                  </FormField>
                  <FormField label="Заголовок">
                    <Input
                      value={segment.title ?? ''}
                      disabled={!canWrite}
                      onChange={(event) => updateSegment(segment.id, { title: event.target.value })}
                    />
                  </FormField>
                  <FormField label="Краткий заголовок">
                    <Input
                      value={segment.shortTitle ?? ''}
                      disabled={!canWrite}
                      placeholder={segment.title ?? segment.name}
                      onChange={(event) =>
                        updateSegment(segment.id, {
                          shortTitle: event.target.value.trim() || undefined,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="SQL условие">
                    <textarea
                      className="flex min-h-[72px] w-full rounded-md border border-input bg-card px-2.5 py-2 font-mono text-[12px]"
                      value={segment.sql}
                      disabled={!canWrite}
                      placeholder="status = 'completed'"
                      onChange={(event) => updateSegment(segment.id, { sql: event.target.value })}
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}

        {canWrite ? (
          <Button type="button" size="sm" disabled={!canWrite} onClick={addSegment}>
            <Plus size={14} />
            Добавить сегмент
          </Button>
        ) : null}
      </div>
    </div>
  );
}
