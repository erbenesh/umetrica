import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function TrustList({
  items,
  className,
}: {
  items: Array<{ icon: LucideIcon; text: React.ReactNode }>;
  className?: string;
}) {
  return (
    <ul className={cn('m-0 list-none space-y-2 p-0', className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <li key={index} className="flex gap-2.5 text-[13px] leading-snug text-muted-foreground">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
            <span>{item.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
