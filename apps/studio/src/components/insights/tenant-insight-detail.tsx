import type { Insight } from '@umetrica/core';
import { Link } from 'react-router-dom';

import { InsightDetailActions } from '@/components/insights/insight-detail-actions';
import { InsightSourceBadge } from '@/components/doc/insight-source-badge';
import type { InsightRelatedLink } from '@/lib/insight-related-links';
import { cn } from '@/lib/utils';

const severityLabels = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
} as const;

const severityTagClass = {
  low: 'db-tag--blue',
  medium: 'db-tag--orange',
  high: 'db-tag--red',
} as const;

const METRIC_LABELS: Record<string, string> = {
  'Orders.revenue': 'Orders.revenue',
  'Orders.count': 'Orders.count',
  'Orders.avgOrder': 'Orders.avgOrder',
};

export function TenantInsightDetailView({
  insight,
  orgName,
  relatedLinks,
  dashboardHref,
  onArchive,
  isArchiving = false,
}: {
  insight: Insight;
  orgName?: string;
  relatedLinks: InsightRelatedLink[];
  dashboardHref: string;
  onArchive: () => void;
  isArchiving?: boolean;
}) {
  const { anomaly, drivers } = insight.brief;
  const { evaluation } = insight;
  const isUp = anomaly.direction === 'up';
  const changeLabel = `${isUp ? '↑' : '↓'} ${Math.abs(anomaly.changePct).toFixed(0)}%`;

  const source = insight.source ?? 'tenant';
  const widgetLinks = relatedLinks.filter((link) => link.to.startsWith('/dashboards/'));
  const segmentDriver = drivers.find((driver) => driver.dimension === 'Benchmark.segment');
  const percentileBadge = segmentDriver?.name.split(' · ')[0];

  return (
    <div>
      <div className="insight-detail__hero">
        <div className="insight-detail__badges">
          <InsightSourceBadge source={source} />
          {source === 'benchmark' && percentileBadge ? (
            <span className="db-tag db-tag--red">{percentileBadge}</span>
          ) : (
            <span className={cn('db-tag', severityTagClass[anomaly.severity])}>
              {severityLabels[anomaly.severity]} значимость
            </span>
          )}
          {source !== 'benchmark' ? (
            <span className={cn('db-tag', isUp ? 'db-tag--green' : 'db-tag--red')}>{changeLabel}</span>
          ) : null}
          <span className="db-tag db-tag--gray">
            {METRIC_LABELS[anomaly.metric] ?? anomaly.metric}
          </span>
        </div>
        <h1 className="doc-title m-0 text-lg font-semibold tracking-tight">{evaluation.summary}</h1>
        <p className="doc-lead m-0 mt-1.5 text-xs text-muted-foreground">
          {new Date(insight.createdAt).toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {orgName ? ` · ${orgName}` : ''}
          {insight.provider ? ` · ${insight.provider}` : ''}
        </p>
      </div>

      <section className="insight-detail__section">
        <h2>{source === 'benchmark' ? 'Сравнение' : 'Что произошло'}</h2>
        <p>{evaluation.whatHappened}</p>
      </section>

      {source === 'tenant' && drivers.length > 0 ? (
        <section className="insight-detail__section">
          <h2>Почему</h2>
          <p>
            Основные драйверы:{' '}
            {drivers.map((driver) => `${driver.name} (${driver.contributionPct}%)`).join(', ')}.
          </p>
        </section>
      ) : null}

      <section className="insight-detail__section">
        <h2>Что делать</h2>
        <ul>
          {evaluation.recommendations.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </section>

      {evaluation.hypotheses.length > 0 && source === 'tenant' ? (
        <section className="insight-detail__section">
          <h2>Гипотезы</h2>
          <ul>
            {evaluation.hypotheses.map((hypothesis, index) => (
              <li key={index}>
                {hypothesis.cause}
                <span className="mt-1 block text-xs text-muted-foreground">
                  Уверенность: {Math.round(hypothesis.confidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {source === 'benchmark' ? (
        <section className="insight-detail__section">
          <h2>Как считается бенчмарк</h2>
          <p className="text-sm text-muted-foreground">
            Сегмент формируется по категории и сопоставимым SKU. В пул попадают селлеры с{' '}
            <Link to="/settings/privacy" className="font-medium text-primary hover:underline">
              включённым участием
            </Link>{' '}
            и в период охлаждения после отключения. Смотреть бенчмарки можно только при активном
            участии. Вывод — при ≥10 участниках в сегменте. Сырые данные конкурентов не
            раскрываются.
          </p>
        </section>
      ) : null}

      {widgetLinks.length > 0 && source === 'tenant' ? (
        <section className="insight-detail__section">
          <h2>Связанные виджеты</h2>
          <ul className="semantic-preview__links m-0 list-none p-0">
            {widgetLinks.map((link) => (
              <li key={link.to + link.label} className="mb-1.5 last:mb-0">
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
            <li>
              <Link to="/">KPI на главной</Link>
            </li>
          </ul>
        </section>
      ) : null}

      <InsightDetailActions
        insightId={insight.id}
        dashboardHref={dashboardHref}
        onArchive={onArchive}
        isArchiving={isArchiving}
      />
    </div>
  );
}
