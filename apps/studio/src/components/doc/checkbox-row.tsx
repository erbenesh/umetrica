import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function CheckboxRow({
  children,
  className,
  compact,
  center,
}: {
  children: ReactNode;
  className?: string;
  /** Table cells and settings toggles — no min-height padding */
  compact?: boolean;
  /** Center checkbox in table column */
  center?: boolean;
}) {
  return (
    <label
      className={cn(
        'checkbox-row',
        compact && 'checkbox-row--compact',
        center && 'checkbox-row--center',
        className
      )}
    >
      {children}
    </label>
  );
}
