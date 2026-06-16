import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { NavCrumb } from '@/lib/navigation-trail';

export function DocBreadcrumb({
  ancestors,
  current,
}: {
  ancestors: NavCrumb[];
  current: string;
}) {
  if (ancestors.length === 0) return null;

  return (
    <nav
      aria-label="Путь навигации"
      className="mb-2 hidden items-center gap-1 text-[12px] text-muted-foreground md:flex"
    >
      {ancestors.map((crumb, index) => (
        <span key={crumb.href} className="inline-flex items-center gap-1">
          {index > 0 ? <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden /> : null}
          <Link to={crumb.href} className="hover:text-foreground">
            {crumb.label}
          </Link>
        </span>
      ))}
      <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden />
      <span className="font-medium text-foreground">{current}</span>
    </nav>
  );
}
