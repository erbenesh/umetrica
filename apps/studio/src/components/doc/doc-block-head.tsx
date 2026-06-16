import type { ReactNode } from 'react';



export function DocBlockHead({

  title,

  hint,

  actions,

}: {

  title: string;

  hint?: string;

  actions?: ReactNode;

}) {

  return (

    <div className="doc-block__head">

      <h2 className="doc-h2 m-0 text-sm font-semibold text-foreground">

        {title}

        {hint ? <span className="doc-h2__hint"> {hint}</span> : null}

      </h2>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}

    </div>

  );

}


