import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ThemeToggle } from '@/components/theme-toggle';
import { BRAND_MARK, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

function BrandMark() {
  return (
    <Link to="/auth" className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
        {BRAND_MARK}
      </span>
      <div className="leading-none">
        <div className="text-sm font-semibold tracking-tight">{BRAND_NAME}</div>
        <div className="text-[10px] text-muted-foreground">{BRAND_TAGLINE}</div>
      </div>
    </Link>
  );
}

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-11 items-center justify-between border-b border-border px-4">
        <BrandMark />
        <ThemeToggle />
      </header>

      <main className="flex min-h-[calc(100vh-2.75rem)] items-center justify-center px-4 py-6">
        <div className="w-full max-w-[360px] space-y-3">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">{children}</div>

          {footer}
        </div>
      </main>
    </div>
  );
}

export function AuthFooterLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="block text-center text-xs text-muted-foreground hover:text-foreground">
      {children}
    </Link>
  );
}

export function AuthModeSwitch({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full text-xs text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
