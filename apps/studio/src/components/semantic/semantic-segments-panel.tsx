import type { SemanticCubeDefinition, SemanticSegment } from '@umetrica/core';
import { semanticMemberLabel } from '@umetrica/core';
import { Plus, Trash2 } from 'lucide-react';

import { DocCallout } from '@/components/doc/doc-callout';
import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SemanticSegmentsPanelProps {
  draft: SemanticCubeDefinition;
  canWrite: boolean;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
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
  onDraftChange,
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
  };

  const removeSegment = (id: string) => {
    onDraftChange({
      ...draft,
      segments: segments.filter((segment) => segment.id !== id),
    });
  };

  return (
    <div className="semantic-relationships-page">
      <div className="semantic-panel max-w-3xl">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Сегменты</h2>
          <p className="semantic-panel__desc">
            Именованные фильтры куба. Используются в запросах как{' '}
            <code className="text-xs">{draft.name}.segmentName</code>.
          </p>
        </div>

        <DocCallout variant="info">
          Сегменты публикуются в Cube.js YAML и доступны в Playground и виджетах через{' '}
          <code className="text-xs">segments</code> в query.
        </DocCallout>

        {segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Сегментов пока нет.</p>
        ) : (
          <div className="form-fields max-w-none">
            {segments.map((segment) => (
              <div key={segment.id} className="rounded-lg border border-border p-4">
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
