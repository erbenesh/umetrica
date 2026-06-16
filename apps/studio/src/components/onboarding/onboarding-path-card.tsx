import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export function OnboardingPathCard({
  to,
  icon: Icon,
  title,
  hint,
  recommended,
  state,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  hint: React.ReactNode;
  recommended?: boolean;
  state?: Record<string, unknown>;
}) {
  return (
    <Link
      to={to}
      state={state}
      className={cn(
        'flex items-start gap-3.5 rounded-md border border-border bg-card p-3.5 text-inherit no-underline transition-colors hover:border-primary hover:bg-primary/5',
        recommended && 'border-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_25%,transparent)]'
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-sm bg-secondary text-muted-foreground',
          recommended && 'bg-primary/10 text-primary'
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 mb-1 text-[15px] font-semibold text-foreground">{title}</p>
        <p className="m-0 text-[13px] leading-snug text-muted-foreground">{hint}</p>
      </div>
      {recommended ? (
        <span className="shrink-0 self-center text-[11px] font-semibold uppercase tracking-wide text-primary">
          Рекомендуем
        </span>
      ) : null}
    </Link>
  );
}
