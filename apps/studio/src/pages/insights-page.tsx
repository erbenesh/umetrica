import { Loader2, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { InsightSource } from '@/components/doc/insight-source-badge';
import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { InsightFeedFilters } from '@/components/doc/insight-feed-filters';
import { InsightFeedItem } from '@/components/insights/insight-feed-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBilling } from '@/hooks/use-billing';
import { useGenerateInsight, useInsights } from '@/hooks/use-insights';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { buildInsightsDocProps } from '@/lib/workspace-status';

function FeedEmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-border-strong px-6 py-11 text-center">
      <h3 className="m-0 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-foreground-secondary">{body}</p>
      {action ? (
        <Link to={action.href} className="mt-4 text-[13px] font-medium text-primary hover:underline">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function InsightsPage() {
  const { data: me } = useMe();
  const canManage = useCanWriteDashboards();
  const { data: billing } = useBilling();
  const { data, isLoading, error } = useInsights();
  const generate = useGenerateInsight();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | InsightSource>('all');
  const isDemo = me?.dataMode !== 'live';

  const allItems = data?.items ?? [];
  const filteredItems =
    sourceFilter === 'all'
      ? allItems
      : allItems.filter((insight) => (insight.source ?? 'tenant') === sourceFilter);

  const docProps = useMemo(
    () =>
      buildInsightsDocProps({
        itemCount: allItems.length,
        billing: billing ?? null,
        canManage,
      }),
    [allItems.length, billing, canManage]
  );

  const handleGenerate = async () => {
    setStatusMessage(null);
    try {
      const result = await generate.mutateAsync();
      if (!result.generated && result.message) {
        setStatusMessage(result.message);
        return;
      }
      if (result.generated && result.count) {
        setStatusMessage(`Добавлено инсайтов: ${result.count}`);
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Не удалось обновить ленту');
    }
  };

  const desktopActions = (
    <>
      {canManage ? (
        <Link to="/insights/settings">
          <Button variant="ghost" size="sm" type="button">
            <SlidersHorizontal className="size-3.5" />
            Настройки
          </Button>
        </Link>
      ) : null}
      <Button onClick={handleGenerate} disabled={generate.isPending} type="button">
        {generate.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        Обновить
      </Button>
    </>
  );

  const mobileActions = (
    <>
      {canManage ? (
        <Link to="/insights/settings" aria-label="Настройки инсайтов">
          <Button variant="ghost" size="icon-sm" type="button">
            <SlidersHorizontal size={16} />
          </Button>
        </Link>
      ) : null}
      <Button size="sm" onClick={handleGenerate} disabled={generate.isPending} type="button">
        {generate.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
      </Button>
    </>
  );

  return (
    <DocPage
      title="AI-инсайты"
      lead="Заметные изменения в продажах и тренды вашей категории"
      icon={Sparkles}
      actions={desktopActions}
      mobileActions={mobileActions}
      props={docProps}
    >
      {isDemo && canManage && filteredItems.length === 0 && !isLoading ? (
        <DocCallout variant="info">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0 text-sm">
              Рыночные сигналы уже доступны. Для инсайтов по кабинету подключите данные.
            </p>
            <Link to="/onboarding/connect">
              <Button size="sm" type="button">
                Подключить данные
              </Button>
            </Link>
          </div>
        </DocCallout>
      ) : null}

      <DocBlock>
        <InsightFeedFilters value={sourceFilter} onChange={setSourceFilter} />

        {statusMessage ? (
          <Card className="mb-3 border-border">
            <CardContent className="p-3 text-xs text-muted-foreground">{statusMessage}</CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <Card className="mb-3 border-border">
            <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Загрузка...
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="mb-3 border-border">
            <CardContent className="p-3 text-xs text-destructive">
              {error instanceof Error ? error.message : 'Ошибка загрузки'}
            </CardContent>
          </Card>
        ) : null}

        <div className="insight-feed">
          {filteredItems.length === 0 && !isLoading && !error ? (
            <div className="py-8">
              <FeedEmptyState
                title={
                  sourceFilter === 'market'
                    ? 'Рыночных инсайтов пока нет'
                    : sourceFilter === 'benchmark'
                      ? 'Бенчмарков пока нет'
                      : 'Инсайтов пока нет'
                }
                body={
                  sourceFilter === 'market'
                    ? 'Нажмите «Обновить» — появится сигнал по вашей категории.'
                    : sourceFilter === 'benchmark'
                      ? 'Включите бенчмарки в настройках и нажмите «Обновить».'
                      : 'Нажмите «Обновить» — проверим продажи за последнюю неделю.'
                }
                action={
                  sourceFilter === 'benchmark'
                    ? { label: 'Настройки бенчмарков', href: '/settings/privacy' }
                    : sourceFilter === 'tenant' && canManage && isDemo
                      ? { label: 'Подключить данные', href: '/onboarding/connect' }
                      : undefined
                }
              />
            </div>
          ) : null}
          {filteredItems.map((insight) => (
            <InsightFeedItem key={insight.id} insight={insight} />
          ))}
        </div>

        {allItems.length > 0 ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/insights/history" className="text-primary hover:underline">
              История инсайтов
            </Link>
          </p>
        ) : null}
      </DocBlock>
    </DocPage>
  );
}
