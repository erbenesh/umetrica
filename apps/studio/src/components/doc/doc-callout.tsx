import type { ReactNode } from 'react';



import { cn } from '@/lib/utils';



export function DocCallout({

  children,

  className,

  variant = 'warning',

}: {

  children: ReactNode;

  className?: string;

  variant?: 'warning' | 'info';

}) {

  return (

    <div className={cn('callout', variant === 'info' && 'callout--info', className)}>{children}</div>

  );

}


