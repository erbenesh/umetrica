import { Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { InsightCard } from '@/components/insights/insight-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeleteInsight, useGenerateInsight, useInsights } from '@/hooks/use-insights';

export function InsightsPage() {
  const { data, isLoading, error } = useInsights();
  const generate = useGenerateInsight();
  const deleteInsight = useDeleteInsight();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStatusMessage(null);
    try {
      const result = await generate.mutateAsync();
      if (!result.generated && result.message) {
        setStatusMessage(result.message);
        return;
      }
      if (result.generated && result.count) {
        setStatusMessage(`Создано инсайтов: ${result.count}`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Не удалось сгенерировать инсайт');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить инсайт?')) return;
    await deleteInsight.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lightbulb className="text-insight-info" />
            <h1 className="text-2xl font-bold">AI-инсайты</h1>
          </div>
          <p className="text-muted-foreground">
            Проактивные оценки: что произошло, почему и что делать.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generate.isPending}>
          {generate.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Проверить аномалии
        </Button>
      </div>

      {statusMessage && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">{statusMessage}</CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загрузка инсайтов...
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-5 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Ошибка загрузки'}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && data?.items.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Пока пусто</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Нажмите «Проверить аномалии» — система сравнит выручку и число заказов за 7 дней
            с предыдущим периодом, соберёт brief и оценит через AI.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {data?.items.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onDelete={handleDelete}
            isDeleting={deleteInsight.isPending}
          />
        ))}
      </div>
    </div>
  );
}
