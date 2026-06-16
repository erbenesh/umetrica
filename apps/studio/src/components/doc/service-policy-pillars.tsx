import type { TrustPolicyPillar } from '@sellerpool/core';

import { cn } from '@/lib/utils';

export function ServicePolicyPillars({
  pillars,
  className,
}: {
  pillars: TrustPolicyPillar[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {pillars.map((pillar) => (
        <span
          key={pillar.id}
          title={pillar.description}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight',
            pillar.active
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border bg-muted/40 text-muted-foreground'
          )}
        >
          {pillar.label}
        </span>
      ))}
    </div>
  );
}
