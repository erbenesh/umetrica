import { BarChart3, Home, Lightbulb, LogOut, Menu, Users, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { OrgSwitcher } from '@/components/layout/org-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Главная', icon: Home },
  { to: '/insights', label: 'Инсайты', icon: Lightbulb },
  { to: '/dashboards', label: 'Дашборды', icon: BarChart3 },
  { to: '/team', label: 'Команда', icon: Users },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
        u
      </span>
      {!compact && (
        <div className="leading-none">
          <div className="text-sm font-semibold tracking-tight">umetrica</div>
          <div className="text-[10px] text-muted-foreground">Данные → Ответы</div>
        </div>
      )}
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
          isActive
            ? 'bg-sidebar-accent font-medium text-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground'
        )
      }
    >
      <Icon size={15} strokeWidth={1.75} />
      {label}
    </NavLink>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-11 items-center border-b border-sidebar-border px-3">
        <BrandMark />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-2">
        <OrgSwitcher />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="flex-1 justify-start px-2" onClick={() => signOut()}>
            <LogOut size={14} />
            Выйти
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex h-11 items-center justify-between border-b border-border bg-card px-3 md:hidden">
        <BrandMark compact />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </Button>
        </div>
      </header>

      {open && (
        <div className="border-b border-border bg-card p-2 md:hidden">
          <div className="mb-2">
            <OrgSwitcher />
          </div>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />
            ))}
            <Button variant="ghost" size="sm" className="mt-1 justify-start px-2.5" onClick={() => signOut()}>
              <LogOut size={14} />
              Выйти
            </Button>
          </nav>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px]',
                isActive ? 'font-medium text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon size={16} strokeWidth={1.75} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />
      <div className="flex min-h-screen flex-1 flex-col pb-12 md:pb-0">
        <MobileNav />
        <main className="flex-1 p-3 md:p-4">
          <EmailVerificationBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
