import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export function ThemeSegmented({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn('inline-flex rounded-md border border-border bg-muted p-0.5', className)}
      role="group"
      aria-label="Тема"
    >
      {(['light', 'dark'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
            theme === value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {value === 'light' ? 'Светлая' : 'Тёмная'}
        </button>
      ))}
    </div>
  );
}
