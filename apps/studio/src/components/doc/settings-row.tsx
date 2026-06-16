import type { ReactNode } from 'react';

import { Link } from 'react-router-dom';



import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';



export function SettingsGroup({ children, className }: { children: ReactNode; className?: string }) {

  return <div className={cn('settings-group', className)}>{children}</div>;

}



export function SettingsRow({

  label,

  hint,

  children,

  action,

  actionTo,

  actionLabel,

  onAction,

  className,

}: {

  label: ReactNode;

  hint?: ReactNode;

  children?: ReactNode;

  action?: ReactNode;

  actionTo?: string;

  actionLabel?: string;

  onAction?: () => void;

  className?: string;

}) {

  const actionNode =

    action ??

    (actionTo ? (

      <Link to={actionTo}>

        <Button variant="ghost" size="sm" type="button">

          {actionLabel ?? 'Открыть'}

        </Button>

      </Link>

    ) : onAction ? (

      <Button variant="ghost" size="sm" onClick={onAction}>

        {actionLabel ?? 'Открыть'}

      </Button>

    ) : null);



  return (

    <div className={cn('settings-row', className)}>

      <div className="min-w-0 flex-1">

        {children ?? (

          <>

            <div className="settings-row__label">{label}</div>

            {hint ? <div className="settings-row__hint">{hint}</div> : null}

          </>

        )}

      </div>

      {actionNode ? <div className="shrink-0">{actionNode}</div> : null}

    </div>

  );

}


