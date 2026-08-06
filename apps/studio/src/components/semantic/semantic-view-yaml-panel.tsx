import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useApplySemanticViewYaml, useSemanticViewYaml } from '@/hooks/use-semantic';

interface SemanticViewYamlPanelProps {
  viewName: string;
  canWrite: boolean;
}

export function SemanticViewYamlPanel({ viewName, canWrite }: SemanticViewYamlPanelProps) {
  const { data, isLoading } = useSemanticViewYaml(viewName, 'draft', true);
  const applyYaml = useApplySemanticViewYaml(viewName);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.yaml) setValue(data.yaml);
  }, [data?.yaml]);

  const handleApply = async () => {
    setError(null);
    try {
      await applyYaml.mutateAsync(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось применить YAML');
    }
  };

  const handleReset = () => {
    if (data?.yaml) {
      setValue(data.yaml);
      setError(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Загрузка YAML...
      </div>
    );
  }

  return (
    <div className="semantic-yaml-panel">
      <div className="semantic-yaml-panel__toolbar">
        <Button variant="outline" size="sm" type="button" onClick={() => navigator.clipboard.writeText(value)}>
          Копировать
        </Button>
        {canWrite ? (
          <Button variant="outline" size="sm" type="button" onClick={handleReset}>
            Сбросить к визуальной модели
          </Button>
        ) : null}
        {canWrite ? (
          <Button size="sm" type="button" disabled={applyYaml.isPending} onClick={handleApply}>
            {applyYaml.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Применить из YAML
          </Button>
        ) : null}
      </div>
      <textarea
        className="semantic-yaml-panel__editor"
        value={value}
        readOnly={!canWrite}
        spellCheck={false}
        onChange={(event) => setValue(event.target.value)}
      />
      {error ? <p className="m-0 px-4 pb-4 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
