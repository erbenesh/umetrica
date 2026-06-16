import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { AuthAmbient } from '@/components/layout/auth-ambient';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export type AuthTopbarVariant = 'full' | 'mark' | 'back';

export function AuthSplitLayout({
  brandTitle,
  brandDescription,
  brandStats,
  brandTag,
  showBrandBlock = true,
  topbar = 'full',
  backTo,
  backLabel,
  panelTitle,
  panelDescription,
  footer,
  children,
  className,
}: {
  brandTitle: string;
  brandDescription: string;
  brandStats?: Array<{ value: string; label: string }>;
  brandTag?: string;
  showBrandBlock?: boolean;
  topbar?: AuthTopbarVariant;
  backTo?: string;
  backLabel?: string;
  panelTitle: string;
  panelDescription?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const brandBlock = (
    <div className="brand">
      <span className="brand__mark">u</span>
      <span>
        <div className="brand__name">umetrica</div>
        {brandTag ? <div className="brand__tag">{brandTag}</div> : null}
      </span>
    </div>
  );

  return (
    <div className={cn('auth-frame', className)}>
      <aside className="auth-brand-panel">
        <AuthAmbient />
        <div>
          {showBrandBlock ? <div className="mb-8">{brandBlock}</div> : null}
          <h2>{brandTitle}</h2>
          <p>{brandDescription}</p>
        </div>
        {brandStats && brandStats.length > 0 ? (
          <div className="auth-brand-panel__stats">
            {brandStats.map((stat) => (
              <div key={stat.label} className="auth-stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </aside>

      <div className="auth-form-panel">
        <AuthAmbient />

        <header className="auth-topbar">
          {topbar === 'full' ? (
            <Link to="/auth" className="brand">
              <span className="brand__mark">u</span>
              <span>
                <div className="brand__name">umetrica</div>
              </span>
            </Link>
          ) : topbar === 'mark' ? (
            <Link to="/auth" className="brand" aria-label="umetrica">
              <span className="brand__mark">u</span>
            </Link>
          ) : backTo ? (
            <Link to={backTo} className="text-xs text-muted-foreground hover:text-foreground">
              ← {backLabel ?? 'Назад'}
            </Link>
          ) : (
            <span className="brand__mark">u</span>
          )}
          <ThemeToggle />
        </header>

        <main className="auth-main">
          <div className="auth-panel">
            <div className="auth-panel__head">
              <h1>{panelTitle}</h1>
              {panelDescription ? <p>{panelDescription}</p> : null}
            </div>

            <div className="auth-panel__card">{children}</div>

            {footer ? <div className="auth-panel__footer">{footer}</div> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
