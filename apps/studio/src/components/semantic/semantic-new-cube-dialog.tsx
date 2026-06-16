import type { CreateSemanticCubeInput, SemanticTableInfo } from '@umetrica/core';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useConnections } from '@/hooks/use-connections';
import { useCreateSemanticCube, useSemanticSchemaTables } from '@/hooks/use-semantic';
import { tableToCubeName } from '@/lib/semantic-utils';

interface SemanticNewCubeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SemanticNewCubeDialog({ open, onClose }: SemanticNewCubeDialogProps) {
  const navigate = useNavigate();
  const { data: connections } = useConnections();
  const postgresConnections = useMemo(
    () =>
      (connections?.items ?? []).filter(
        (item) => item.kind === 'database' && (item.provider === 'postgresql' || item.provider === 'postgres')
      ),
    [connections?.items]
  );

  const [connectionId, setConnectionId] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: schema, isLoading: tablesLoading } = useSemanticSchemaTables(
    connectionId || undefined,
    open
  );
  const createCube = useCreateSemanticCube();

  useEffect(() => {
    if (!open) return;
    setConnectionId(postgresConnections[0]?.id ?? '');
    setSelectedTable('');
    setDisplayTitle('');
    setError(null);
  }, [open, postgresConnections]);

  useEffect(() => {
    if (!selectedTable) return;
    setDisplayTitle((current) => current || tableToCubeName(selectedTable));
  }, [selectedTable]);

  if (!open) return null;

  const tables = schema?.items ?? [];
  const usingDemo = postgresConnections.length === 0;

  const handleCreate = async () => {
    if (!selectedTable) {
      setError('Выберите таблицу');
      return;
    }

    setError(null);

    const payload: CreateSemanticCubeInput = {
      table: selectedTable,
      displayTitle: displayTitle.trim() || undefined,
      ...(connectionId ? { connectionId } : {}),
    };

    try {
      const cube = await createCube.mutateAsync(payload);
      onClose();
      navigate(`/semantic/cubes/${cube.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать куб');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <Card className="w-full max-w-lg rounded-b-none sm:rounded-b-lg">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <CardHeader className="pb-2">
          <CardTitle>Новый куб</CardTitle>
          <p className="m-0 text-[13px] text-muted-foreground">
            Выберите таблицу PostgreSQL — меры и измерения создадутся автоматически. После создания
            опубликуйте куб, чтобы он появился в виджетах.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {usingDemo ? (
            <p className="m-0 text-xs text-muted-foreground">
              PostgreSQL не подключён — показываем таблицы демо-БД.{' '}
              <Link to="/settings/connections/add-db" className="text-primary hover:underline">
                Подключить БД
              </Link>
            </p>
          ) : (
            <FormField label="Подключение">
              <select
                className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                value={connectionId}
                onChange={(event) => {
                  setConnectionId(event.target.value);
                  setSelectedTable('');
                }}
              >
                {postgresConnections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <FormField
            label="Таблица"
            hint={schema?.connectionLabel ? `Источник: ${schema.connectionLabel}` : undefined}
          >
            {tablesLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Читаем schema...
              </div>
            ) : (
              <select
                className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                value={selectedTable}
                onChange={(event) => setSelectedTable(event.target.value)}
              >
                <option value="">Выберите таблицу</option>
                {tables.map((table: SemanticTableInfo) => (
                  <option key={table.qualifiedName} value={table.qualifiedName}>
                    {table.qualifiedName} · {table.columnCount} кол.
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField label="Заголовок куба">
            <Input
              value={displayTitle}
              onChange={(event) => setDisplayTitle(event.target.value)}
              placeholder={selectedTable ? tableToCubeName(selectedTable) : 'Заказы'}
            />
          </FormField>

          {error ? <p className="m-0 text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" type="button" onClick={onClose} disabled={createCube.isPending}>
              Отмена
            </Button>
            <Button type="button" onClick={handleCreate} disabled={createCube.isPending || tablesLoading}>
              {createCube.isPending ? 'Создание...' : 'Создать куб'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
