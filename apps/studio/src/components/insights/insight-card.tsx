import type { Insight } from '@sellerpool/core';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { InsightSourceBadge } from '@/components/doc/insight-source-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const severityStyles = {
  low: 'bg-insight-info/10 text-insight-info',
  medium: 'bg-insight-warning/10 text-insight-warning',
  high: 'bg-destructive/10 text-destructive',
} as const;

const severityLabels = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
} as const;

interface InsightCardProps {
  insight: Insight;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export function InsightCard({ insight, onDelete, isDeleting }: InsightCardProps) {
  const { anomaly, drivers } = insight.brief;
  const { evaluation } = insight;
  const isUp = anomaly.direction === 'up';

  return (
    <Card className="border-l-2 border-l-insight-info">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="mb-1">
              <InsightSourceBadge source="tenant" />
            </div>
            <CardTitle className="text-base">
              <Link to={`/insights/${insight.id}`} className="hover:text-primary">
                {evaluation.summary}
              </Link>
            </CardTitle>
            <CardDescription>
              {new Date(insight.createdAt).toLocaleString('ru-RU')}
              {insight.provider ? ` · ${insight.provider}` : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isDeleting}
                onClick={() => onDelete(insight.id)}
              >
                <Trash2 size={14} className="text-insight-warning" />
              </Button>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                severityStyles[anomaly.severity]
              )}
            >
              <AlertTriangle className="size-3.5" />
              {severityLabels[anomaly.severity]}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
              )}
            >
              {isUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {anomaly.changePct > 0 ? '+' : ''}
              {anomaly.changePct}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <section>
          <h4 className="mb-1 font-medium">Что произошло</h4>
          <p className="text-muted-foreground">{evaluation.whatHappened}</p>
        </section>

        {drivers.length > 0 && (
          <section>
            <h4 className="mb-2 font-medium">Драйверы</h4>
            <div className="flex flex-wrap gap-2">
              {drivers.map((driver) => (
                <span
                  key={`${driver.dimension}-${driver.name}`}
                  className="rounded-md border border-border px-2 py-1 text-xs"
                >
                  {driver.name}: {driver.contributionPct}%
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <h4 className="mb-2 font-medium">Гипотезы</h4>
          <ul className="space-y-2">
            {evaluation.hypotheses.map((hypothesis, index) => (
              <li key={index} className="rounded-md border border-border p-3">
                <p>{hypothesis.cause}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Уверенность: {Math.round(hypothesis.confidence * 100)}%
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-2 font-medium">Рекомендации</h4>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {evaluation.recommendations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-muted-foreground">
          Общая уверенность оценки: {Math.round(evaluation.confidence * 100)}%
        </p>
        <Link
          to={`/insights/${insight.id}`}
          className="inline-block text-xs font-medium text-primary hover:underline"
        >
          Подробнее →
        </Link>
      </CardContent>
    </Card>
  );
}
