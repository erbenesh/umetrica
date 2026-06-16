import { cn } from '@/lib/utils';



const VARIANT_CLASS = {

  success: 'badge--success',

  warning: 'badge--warn',

  muted: 'badge--muted',

  primary: 'badge--info',

  danger: 'badge--danger',

} as const;



export function StatusBadge({

  children,

  variant = 'muted',

  className,

}: {

  children: React.ReactNode;

  variant?: keyof typeof VARIANT_CLASS;

  className?: string;

}) {

  return <span className={cn('badge', VARIANT_CLASS[variant], className)}>{children}</span>;

}


