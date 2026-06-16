import { cn } from '@/lib/utils';

export type InsightSource = 'tenant' | 'market' | 'benchmark';

const SOURCE_CONFIG: Record<InsightSource, { label: string; className: string }> = {
  tenant: {
    label: 'Ваши данные',
    className: 'bg-secondary text-foreground-secondary',
  },
  market: {
    label: 'Рынок',
    className: 'bg-primary-muted text-primary',
  },
  benchmark: {
    label: 'Бенчмарк',
    className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
};

export function InsightSourceBadge({
  source,
  className,
}: {
  source: InsightSource;
  className?: string;
}) {
  const config = SOURCE_CONFIG[source];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
