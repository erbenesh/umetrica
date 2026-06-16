import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type AppToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  message: string;
  variant: AppToastVariant;
};

const DEFAULT_DURATION = {
  success: 4500,
  info: 5000,
  error: 6500,
} as const;

type ToastListener = (toast: Omit<ToastItem, 'id'>) => void;

let emitToast: ToastListener | null = null;

export const appToast = {
  success(message: string) {
    emitToast?.({ message, variant: 'success' });
  },
  error(message: string) {
    emitToast?.({ message, variant: 'error' });
  },
  info(message: string) {
    emitToast?.({ message, variant: 'info' });
  },
};

function ToastIcon({ variant }: { variant: AppToastVariant }) {
  const className = 'size-4 shrink-0';
  if (variant === 'success') return <CheckCircle2 className={cn(className, 'text-success')} aria-hidden />;
  if (variant === 'error') return <AlertCircle className={cn(className, 'text-insight-warning')} aria-hidden />;
  return <Info className={cn(className, 'text-insight-info')} aria-hidden />;
}

function AppToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  return (
    <div
      className={cn('app-toast', `app-toast--${toast.variant}`)}
      role={toast.variant === 'error' ? 'alert' : 'status'}
    >
      <ToastIcon variant={toast.variant} />
      <p className="app-toast__message">{toast.message}</p>
      <button type="button" className="app-toast__close" onClick={onDismiss} aria-label="Закрыть">
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...toast, id }].slice(-4));
      window.setTimeout(() => dismiss(id), DEFAULT_DURATION[toast.variant]);
    },
    [dismiss],
  );

  useEffect(() => {
    emitToast = push;
    return () => {
      emitToast = null;
    };
  }, [push]);

  return (
    <>
      {children}
      <div className="app-toast-viewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <AppToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </>
  );
}
