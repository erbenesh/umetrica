import { Link } from 'react-router-dom';

import type { WorkspaceStatusItem } from '@/lib/workspace-status';
import { cn } from '@/lib/utils';

const toneClass: Record<NonNullable<WorkspaceStatusItem['tone']>, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  accent: 'text-primary',
  warning: 'text-insight-warning',
};

export function WorkspaceStatusCard({ items }: { items: WorkspaceStatusItem[] }) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const valueClass = toneClass[item.tone ?? 'default'];

        const body = (
          <>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </div>
            <div className={cn('mt-0.5 text-[13px] font-medium leading-snug', valueClass)}>
              {item.value}
            </div>
          </>
        );

        if (item.href) {
          return (
            <Link
              key={item.label}
              to={item.href}
              className="rounded-md px-1 py-0.5 transition-colors hover:bg-muted/50"
            >
              {body}
            </Link>
          );
        }

        return (
          <div key={item.label} className="px-1 py-0.5">
            {body}
          </div>
        );
      })}
    </div>
  );
}
