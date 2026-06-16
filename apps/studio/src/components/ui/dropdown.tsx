import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  menuId: string;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within <Dropdown>');
  }
  return context;
}

export function useOptionalDropdownContext() {
  return useContext(DropdownContext);
}

export function Dropdown({
  children,
  className,
  block,
  defaultOpen = false,
}: {
  children: ReactNode;
  className?: string;
  block?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, toggle, menuId }}>
      <div
        ref={rootRef}
        className={cn('dropdown', block && 'dropdown--block', open && 'is-open', className)}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, toggle, menuId } = useDropdownContext();

  return (
    <button
      type="button"
      className={className}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls={menuId}
      onClick={(event) => {
        event.stopPropagation();
        toggle();
        props.onClick?.(event);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenu({
  children,
  align = 'start',
  className,
}: {
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  const { menuId } = useDropdownContext();

  return (
    <div
      id={menuId}
      role="menu"
      className={cn(
        'dropdown__menu',
        align === 'end' && 'dropdown__menu--align-end',
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownDivider() {
  return <div className="dropdown__divider" role="separator" />;
}

export function useDropdownClose() {
  const { setOpen } = useDropdownContext();
  return useCallback(() => setOpen(false), [setOpen]);
}
