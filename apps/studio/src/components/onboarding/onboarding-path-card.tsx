import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export function OnboardingPathCard({
  to,
  icon: Icon,
  title,
  hint,
  recommended,
  state,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  hint: React.ReactNode;
  recommended?: boolean;
  state?: Record<string, unknown>;
}) {
  return (
    <Link
      to={to}
      state={state}
      className={cn('onboarding-path', recommended && 'onboarding-path--recommended')}
    >
      <span className="onboarding-path__icon">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="onboarding-path__body">
        <p className="onboarding-path__title">{title}</p>
        <p className="onboarding-path__hint">{hint}</p>
      </div>
      {recommended ? <span className="onboarding-path__badge">Рекомендуем</span> : null}
    </Link>
  );
}
