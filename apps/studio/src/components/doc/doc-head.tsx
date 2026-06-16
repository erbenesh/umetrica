import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function DocHead({
  title,
  lead,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  lead?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-0', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {Icon ? (
            <Icon className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          ) : null}
          <h1 className="m-0 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        </div>
        {actions ? (
          <div className="doc-actions hidden shrink-0 items-center gap-2 md:flex">{actions}</div>
        ) : null}
      </div>
      {lead ? (
        <p className={cn('mt-1 text-[13px] leading-snug text-muted-foreground', Icon && 'md:pl-[26px]')}>
          {lead}
        </p>
      ) : null}
    </header>
  );
}
