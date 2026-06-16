import type { ReactNode } from 'react';



import { cn } from '@/lib/utils';



export function DataTable({

  children,

  className,

  toolbar,

}: {

  children: ReactNode;

  className?: string;

  toolbar?: ReactNode;

}) {

  return (

    <div className={cn('db', className)}>

      {toolbar}

      <table className="db-table">{children}</table>

    </div>

  );

}



export function DataTableHead({ children }: { children: ReactNode }) {

  return <thead>{children}</thead>;

}



export function DataTableTh({

  children,

  className,

}: {

  children?: ReactNode;

  className?: string;

}) {

  return <th className={className}>{children}</th>;

}



export function DataTableBody({ children }: { children: ReactNode }) {

  return <tbody>{children}</tbody>;

}



export function DataTableRow({ children, className }: { children: ReactNode; className?: string }) {

  return <tr className={className}>{children}</tr>;

}



export function DataTableTd({

  children,

  className,

  actions,

  colSpan,

}: {

  children: ReactNode;

  className?: string;

  actions?: boolean;

  colSpan?: number;

}) {

  return (

    <td className={className} colSpan={colSpan}>

      <div className={cn('db-cell', actions && 'db-cell--actions')}>{children}</div>

    </td>

  );

}



export function DataCell({

  title,

  subtitle,

}: {

  title: ReactNode;

  subtitle?: ReactNode;

}) {

  return (

    <div>

      <div className="db-cell__title">{title}</div>

      {subtitle ? <div className="db-cell__sub">{subtitle}</div> : null}

    </div>

  );

}



export function DataTableToolbar({

  children,

  className,

}: {

  children: ReactNode;

  className?: string;

}) {

  return (

    <div

      className={cn('db-toolbar', className)}

    >

      {children}

    </div>

  );

}


