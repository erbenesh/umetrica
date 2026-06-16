import type { TrustFaqItem } from '@sellerpool/core';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export function TrustFaq({ items, className }: { items: TrustFaqItem[]; className?: string }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="rounded-md border border-border bg-card">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px] font-medium"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              <span>{item.question}</span>
              <ChevronDown
                className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
              />
            </button>
            {isOpen ? (
              <p className="border-t border-border px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
