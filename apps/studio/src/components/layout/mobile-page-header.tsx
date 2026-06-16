import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export function MobilePageHeader({
  title,
  subtitle,
  back,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  back?: { to: string; label?: string } | null;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mobile-header', className)}>
      <div className="mobile-header__row">
        <div className="mobile-header__start">
          {back ? (
            <Link
              to={back.to}
              aria-label={back.label ?? 'Назад'}
              className="mobile-header__back"
            >
              <ChevronLeft className="size-[22px]" strokeWidth={2} />
            </Link>
          ) : null}
          <div className="mobile-header__body">
            <div className="mobile-header__title">{title}</div>
            {subtitle ? <div className="mobile-header__subtitle">{subtitle}</div> : null}
          </div>
        </div>
        {actions ? <div className="mobile-header__end">{actions}</div> : null}
      </div>
    </header>
  );
}
