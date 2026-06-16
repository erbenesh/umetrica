import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function AuthStatusMessage({
  variant = 'info',
  children,
  className,
}: {
  variant?: 'info' | 'error' | 'success';
  children: ReactNode;
  className?: string;
}) {
  const isError = variant === 'error';

  return (
    <p
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={cn('auth-status', `auth-status--${variant}`, className)}
    >
      {children}
    </p>
  );
}

export function AuthLoadingStatus({ children }: { children: ReactNode }) {
  return (
    <div className="auth-loading" role="status" aria-live="polite" aria-busy="true">
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      {children}
    </div>
  );
}
