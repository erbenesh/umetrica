import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';

export function ListSearchInput({
  value,
  onChange,
  placeholder = 'Поиск…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn('db-search', className)}>
      <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="db-search__input"
        aria-label={placeholder}
      />
    </label>
  );
}

export function matchesListQuery(query: string, ...parts: Array<string | null | undefined>) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return parts.some((part) => part?.toLowerCase().includes(normalized));
}
