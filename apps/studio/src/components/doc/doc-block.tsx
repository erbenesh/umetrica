import type { ReactNode } from 'react';



import { cn } from '@/lib/utils';



export function DocBlock({

  title,

  hint,

  children,

  className,

  headerExtra,

}: {

  title?: string;

  hint?: string;

  children: ReactNode;

  className?: string;

  headerExtra?: ReactNode;

}) {

  return (
    <section className={cn('doc-block', className)}>
      {title ? (
        <div className={headerExtra ? 'doc-block__head' : undefined}>
          <h2 className="doc-h2">
            {title}
            {hint ? <span className="doc-h2__hint">{hint}</span> : null}
          </h2>
          {headerExtra}
        </div>
      ) : null}
      {children}
    </section>
  );

}

