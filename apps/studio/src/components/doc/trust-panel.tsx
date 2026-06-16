import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function TrustPanel({
  title,
  items,
  className,
}: {
  title: string;
  items: Array<{ icon: LucideIcon; text: ReactNode; muted?: boolean }>;
  className?: string;
}) {
  return (
    <div className={cn('rounded-md border border-border bg-muted/30 p-4', className)}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="m-0 list-none space-y-2 p-0">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <li
              key={index}
              className={cn(
                'flex gap-2.5 text-[13px] leading-snug',
                item.muted ? 'text-muted-foreground/70' : 'text-muted-foreground'
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
              <span>{item.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
