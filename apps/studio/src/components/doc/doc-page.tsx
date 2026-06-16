import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { DocHead } from '@/components/doc/doc-head';
import type { DocPropItem } from '@/components/doc/doc-props';
import { DocProps } from '@/components/doc/doc-props';
import { DocBreadcrumb } from '@/components/doc/doc-breadcrumb';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { resolveAncestorTrail, resolveMobileBack } from '@/lib/navigation-trail';
import { cn } from '@/lib/utils';

export function DocPage({
  title,
  lead,
  icon,
  mobileTitle,
  mobileSubtitle,
  back,
  actions,
  mobileActions,
  props,
  children,
  className,
  headless = false,
}: {
  title: string;
  lead?: string;
  icon?: LucideIcon;
  mobileTitle?: string;
  mobileSubtitle?: string;
  back?: { to: string; label?: string } | 'auto' | false;
  actions?: ReactNode;
  mobileActions?: ReactNode;
  props?: DocPropItem[];
  children: ReactNode;
  className?: string;
  headless?: boolean;
}) {
  const { pathname } = useLocation();

  const resolvedBack =
    back === 'auto' ? resolveMobileBack(pathname) : back === false ? null : (back ?? null);

  const ancestorTrail = back === false ? [] : resolveAncestorTrail(pathname);

  const headerActions = actions ?? mobileActions;
  const mobileHeaderActions = mobileActions ?? actions;

  return (
    <div className="app-page">
      <MobilePageHeader
        title={mobileTitle ?? title}
        subtitle={mobileSubtitle}
        back={resolvedBack}
        actions={mobileHeaderActions}
      />

      <div className="app-scroll">
        <article className={cn('doc', className)}>
          {!headless ? (
            <>
              <DocBreadcrumb ancestors={ancestorTrail} current={title} />
              <DocHead title={title} lead={lead} icon={icon} actions={headerActions} />
              {props ? <DocProps items={props} /> : null}
            </>
          ) : null}
          {children}
        </article>
      </div>
    </div>
  );
}
