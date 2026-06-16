import type { SemanticCubeListItem } from '@umetrica/core';
import { semanticCubeLabel } from '@umetrica/core';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCreateSemanticView } from '@/hooks/use-semantic';

interface SemanticNewViewDialogProps {
  open: boolean;
  onClose: () => void;
  cubes: SemanticCubeListItem[];
}

export function SemanticNewViewDialog({ open, onClose, cubes }: SemanticNewViewDialogProps) {
  const navigate = useNavigate();
  const createView = useCreateSemanticView();
  const [title, setTitle] = useState('');
  const [baseCube, setBaseCube] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setBaseCube(cubes[0]?.name ?? '');
    setError(null);
  }, [open, cubes]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!baseCube) {
      setError('Выберите базовый куб');
      return;
    }
    if (!title.trim()) {
      setError('Укажите заголовок');
      return;
    }

    setError(null);

    try {
      const view = await createView.mutateAsync({ title: title.trim(), baseCube });
      onClose();
      navigate(`/semantic/views/${view.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать view');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <Card className="w-full max-w-lg rounded-b-none sm:rounded-b-lg">
        <CardHeader className="pb-2">
          <CardTitle>Новый view</CardTitle>
          <p className="m-0 text-[13px] text-muted-foreground">
            View — curated dataset поверх join paths между кубами
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="form-fields max-w-none">
            <FormField label="Заголовок">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </FormField>
            <FormField label="Базовый куб">
              <select
                className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                value={baseCube}
                onChange={(event) => setBaseCube(event.target.value)}
              >
                {cubes.map((cube) => (
                  <option key={cube.name} value={cube.name}>
                    {semanticCubeLabel(cube)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {error ? <p className="m-0 text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" disabled={createView.isPending} onClick={handleCreate}>
              {createView.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Создать
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
