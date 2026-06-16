import type { InsightSource } from '@/components/doc/insight-source-badge';

import { cn } from '@/lib/utils';



const FILTERS: Array<{ id: 'all' | InsightSource; label: string }> = [

  { id: 'all', label: 'Все' },

  { id: 'tenant', label: 'Ваши данные' },

  { id: 'market', label: 'Рынок' },

  { id: 'benchmark', label: 'Бенчмарк' },

];



export function InsightFeedFilters({

  value,

  onChange,

  className,

}: {

  value: 'all' | InsightSource;

  onChange: (value: 'all' | InsightSource) => void;

  className?: string;

}) {

  return (

    <div className={cn('mb-4 flex flex-wrap gap-2', className)} role="tablist">

      {FILTERS.map((filter) => (

        <button

          key={filter.id}

          type="button"

          role="tab"

          aria-selected={value === filter.id}

          onClick={() => onChange(filter.id)}

          className={cn(

            'min-h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',

            value === filter.id

              ? 'border-primary bg-primary-muted text-primary'

              : 'border-border bg-background text-foreground-secondary hover:border-primary/30 hover:text-foreground'

          )}

        >

          {filter.label}

        </button>

      ))}

    </div>

  );

}

