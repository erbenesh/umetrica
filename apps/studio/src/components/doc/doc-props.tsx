import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export type DocPropItem = {
  label: string;
  value: ReactNode;
  href?: string;
};

export function DocProps({ items, className }: { items: DocPropItem[]; className?: string }) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'mt-3.5 flex flex-wrap gap-x-5 gap-y-2 border-b border-border pb-5',
        className
      )}
    >
      {items.map((item) => {
        const content = (
          <>
            <span className="text-xs text-muted-foreground">{item.label}</span>{' '}
            <span>{item.value}</span>
          </>
        );

        if (item.href) {
          return (
            <Link
              key={item.label}
              to={item.href}
              className="text-sm font-medium text-primary hover:underline"
            >
              {content}
            </Link>
          );
        }

        return (
          <span key={item.label} className="inline-flex items-center gap-2 text-sm">
            {content}
          </span>
        );
      })}
    </div>
  );
}
