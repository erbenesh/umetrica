import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { DocHead } from '@/components/doc/doc-head';

/** @deprecated Use DocPage or DocHead directly */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <DocHead
      title={title}
      lead={description}
      icon={icon}
      actions={actions}
      className={className}
    />
  );
}
