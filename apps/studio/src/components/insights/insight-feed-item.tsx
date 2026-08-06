import type { Insight } from '@sellerpool/core';
import { Link } from 'react-router-dom';

import { InsightSourceBadge } from '@/components/doc/insight-source-badge';
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

function accentClass(severity: Insight['brief']['anomaly']['severity']) {
  if (severity === 'high') return 'insight-item--high';
  if (severity === 'medium') return 'insight-item--warn';
  return 'insight-item--info';
}

export function InsightFeedItem({ insight }: { insight: Insight }) {
  const { anomaly, drivers } = insight.brief;
  const { evaluation } = insight;
  const isUp = anomaly.direction === 'up';
  const changeLabel = `${isUp ? '↑' : '↓'} ${Math.abs(anomaly.changePct).toFixed(0)}%`;

  return (
    <article className={cn('insight-item', accentClass(anomaly.severity))}>
      <div>
        <div className="mb-1">
          <InsightSourceBadge source={insight.source ?? 'tenant'} />
        </div>
        <h3 className="insight-item__title m-0 text-base font-semibold tracking-tight">
          <Link to={`/insights/${insight.id}`} className="text-inherit no-underline hover:text-primary">
            {evaluation.summary}
          </Link>
        </h3>
        <p className="insight-item__meta m-0 mt-1 text-xs text-muted-foreground">
          {new Date(insight.createdAt).toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 self-start">
        <span className={cn('db-tag', severityTagClass[anomaly.severity])}>
          {severityLabels[anomaly.severity]}
        </span>
        <span className={cn('db-tag', isUp ? 'db-tag--green' : 'db-tag--red')}>{changeLabel}</span>
      </div>
      <p className="insight-item__body col-span-full m-0 text-sm text-foreground-secondary">
        {evaluation.whatHappened}
      </p>
      <Link
        to={`/insights/${insight.id}`}
        className="insight-item__link col-span-full text-[13px] font-medium text-primary hover:underline"
      >
        Подробнее →
      </Link>
      {drivers.length > 0 ? (
        <div className="insight-item__tags col-span-full flex flex-wrap gap-1.5">
          {drivers.slice(0, 3).map((driver) => (
            <span key={`${driver.dimension}-${driver.name}`} className="db-tag db-tag--gray">
              {driver.name} · {driver.contributionPct}%
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
