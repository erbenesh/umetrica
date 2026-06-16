import { Loader2, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { InsightSource } from '@/components/doc/insight-source-badge';
import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { InsightFeedFilters } from '@/components/doc/insight-feed-filters';
import { InsightFeedItem } from '@/components/insights/insight-feed-item';
import { WorkspaceStatusCard } from '@/components/workspace/workspace-status-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBilling } from '@/hooks/use-billing';
import { useConnections } from '@/hooks/use-connections';
import { useGenerateInsight, useInsights } from '@/hooks/use-insights';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { usePrivacySettings } from '@/hooks/use-privacy';
import { connectionCabinetLabel } from '@/lib/connection-format';
import { buildWorkspaceStatusItems } from '@/lib/workspace-status';

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
  const { data: connections } = useConnections();
  const { data: privacy } = usePrivacySettings();
  const { data: billing } = useBilling();
  const { data, isLoading, error } = useInsights();
  const generate = useGenerateInsight();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | InsightSource>('all');
  const isDemo = me?.dataMode !== 'live';

  const statusItems = useMemo(
    () =>
      buildWorkspaceStatusItems({
        dataMode: me?.dataMode,
        connections,
        privacy,
        billing: billing ?? null,
        capabilities: me?.trustCapabilities,
        canManage,
      }),
    [me?.dataMode, me?.trustCapabilities, connections, privacy, billing, canManage]
  );

  const orgName = me?.organization?.name ?? '—';
  const allItems = data?.items ?? [];
  const filteredItems =
    sourceFilter === 'all'
      ? allItems
      : allItems.filter((insight) => (insight.source ?? 'tenant') === sourceFilter);
  const newCount = allItems.length;

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

  const desktopActions = (
    <>
      {canManage ? (
        <Link to="/insights/settings">
          <Button variant="ghost" size="sm" type="button">
            <SlidersHorizontal className="size-3.5" />
            Настройки AI
          </Button>
        </Link>
      ) : null}
      <Button onClick={handleGenerate} disabled={generate.isPending} type="button">
        {generate.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        Проверить
      </Button>
    </>
  );

  const mobileActions = (
    <>
      {canManage ? (
        <Link to="/insights/settings" aria-label="Настройки AI">
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
      lead="Ваши данные, рынок и бенчмарки — в одной ленте"
      icon={Sparkles}
      actions={desktopActions}
      mobileActions={mobileActions}
      props={[
        { label: 'Компания', value: orgName },
        { label: 'Новых', value: String(newCount) },
        {
          label: 'AI-кредиты',
          value: billing ? `${billing.creditsUsed} / ${billing.creditsTotal}` : '— / —',
        },
        { label: 'Кабинет', value: connectionCabinetLabel(connections?.items ?? []) },
        { label: 'История', value: '→', href: '/insights/history' },
      ]}
    >
      <DocBlock title="Статус">
        <WorkspaceStatusCard items={statusItems} />
      </DocBlock>

      {isDemo && canManage ? (
        <DocCallout variant="info">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0">
              Инсайты по кабинету требуют своих данных. Рыночные сигналы доступны уже сейчас.
            </p>
            <Link to="/onboarding/connect">
              <Button size="sm" type="button">
                Подключить данные
              </Button>
            </Link>
          </div>
        </DocCallout>
      ) : null}

      <DocCallout>
        Рыночные инсайты — без API. Бенчмарки — при подключении своих данных и участии в пуле:{' '}
        <Link to="/settings/privacy" className="font-medium text-primary hover:underline">
          получать и делиться
        </Link>
        .
        {canManage ? (
          <>
            {' '}
            <Link to="/settings/billing" className="font-medium text-primary hover:underline">
              Биллинг →
            </Link>
          </>
        ) : null}
      </DocCallout>

      <DocBlock>
        <InsightFeedFilters value={sourceFilter} onChange={setSourceFilter} />

        <h2 className="m-0 mb-1 text-sm font-semibold text-foreground">Лента</h2>

        {statusMessage ? (
          <Card className="mb-3 border-border">
            <CardContent className="p-3 text-xs text-muted-foreground">{statusMessage}</CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <Card className="mb-3 border-border">
            <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Загрузка инсайтов...
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
                    ? 'Пока нет рыночных инсайтов'
                    : sourceFilter === 'benchmark'
                      ? 'Пока нет бенчмарков'
                      : 'Пока нет инсайтов по вашим данным'
                }
                body={
                  sourceFilter === 'market'
                    ? 'Нажмите «Проверить» — система добавит сигнал по выбранной категории (без API и без кредитов).'
                    : sourceFilter === 'benchmark'
                      ? 'Включите участие в бенчмарк-пуле в настройках конфиденциальности и дождитесь окончания прогрева — затем нажмите «Проверить».'
                      : 'Нажмите «Проверить» — система сравнит выручку и число заказов за 7 дней с предыдущим периодом.'
                }
                action={
                  sourceFilter === 'benchmark'
                    ? { label: 'Бенчмарк-пул', href: '/settings/privacy' }
                    : sourceFilter === 'market'
                      ? { label: 'Категория для рынка', href: '/settings/privacy' }
                      : canManage
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
      </DocBlock>
    </DocPage>
  );
}
