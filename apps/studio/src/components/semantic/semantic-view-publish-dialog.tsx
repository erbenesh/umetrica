import type { SemanticPublishDiffOp } from '@sellerpool/core';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePublishSemanticView, useSemanticViewPublishPreview } from '@/hooks/use-semantic';

function diffOpLabel(op: SemanticPublishDiffOp) {
  if (op === 'add') return '+';
  if (op === 'remove') return '−';
  return '~';
}

function diffOpClass(op: SemanticPublishDiffOp) {
  if (op === 'add') return 'diff-row__op diff-row__op--add';
  if (op === 'remove') return 'diff-row__op diff-row__op--remove';
  return 'diff-row__op diff-row__op--change';
}

interface SemanticViewPublishDialogProps {
  viewName: string;
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
}

export function SemanticViewPublishDialog({
  viewName,
  open,
  onClose,
  onPublished,
}: SemanticViewPublishDialogProps) {
  const { data: preview, isLoading } = useSemanticViewPublishPreview(viewName, open);
  const publish = usePublishSemanticView(viewName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  if (!open) return null;

  const handlePublish = async () => {
    setError(null);
    try {
      await publish.mutateAsync();
      onPublished();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось опубликовать');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <Card className="w-full max-w-lg rounded-b-none sm:rounded-b-lg">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <CardHeader className="pb-2">
          <CardTitle>Опубликовать {viewName}</CardTitle>
          <p className="m-0 text-[13px] text-muted-foreground">
            Черновик → продакшен · станет доступно в виджетах
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Подготовка изменений…
            </div>
          ) : preview && preview.diff.length > 0 ? (
            <div className="diff-block">
              <div className="diff-block__head">Изменения в представлении</div>
              {preview.diff.map((row) => (
                <div key={`${row.op}-${row.label}-${row.value}`} className="diff-row">
                  <span className={diffOpClass(row.op)}>{diffOpLabel(row.op)}</span>
                  <span className="diff-row__label">{row.label}</span>
                  <span className="diff-row__value">{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-sm text-muted-foreground">
              Черновик совпадает с опубликованной версией — публикация обновит метку времени.
            </p>
          )}

          <p className="m-0 text-xs text-muted-foreground">
            Cube.js перезагрузит meta в течение ~30 сек. Дашборды продолжат работать.
          </p>

          {error ? <p className="m-0 text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" type="button" onClick={onClose} disabled={publish.isPending}>
              Отмена
            </Button>
            <Button type="button" onClick={handlePublish} disabled={publish.isPending || isLoading}>
              {publish.isPending ? 'Публикация...' : 'Опубликовать'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
