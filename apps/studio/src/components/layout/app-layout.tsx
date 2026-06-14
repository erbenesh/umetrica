import { BarChart3, Home, Lightbulb, LogOut, Menu, Users, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { OrgSwitcher } from '@/components/layout/org-switcher';
import { signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Главная', icon: Home },
  { to: '/insights', label: 'Инсайты', icon: Lightbulb },
  { to: '/dashboards', label: 'Дашборды', icon: BarChart3 },
  { to: '/team', label: 'Команда', icon: Users },
];

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
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/50 p-4">
      <div className="mb-8 px-2">
        <div className="text-xl font-bold">umetrica</div>
        <div className="text-xs text-muted-foreground">Данные → Ответы</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
      <div className="mb-3">
        <OrgSwitcher />
      </div>
      <Button variant="ghost" className="justify-start" onClick={() => signOut()}>
        <LogOut size={18} />
        Выйти
      </Button>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex md:hidden items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="font-semibold">umetrica</div>
          <div className="text-xs text-muted-foreground">AI-аналитика</div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </header>

      {open && (
        <div className="md:hidden border-b border-border bg-card p-3">
          <div className="mb-3">
            <OrgSwitcher />
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />
            ))}
            <Button variant="ghost" className="justify-start mt-2" onClick={() => signOut()}>
              <LogOut size={18} />
              Выйти
            </Button>
          </nav>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border bg-card/95 backdrop-blur">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <div className="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
        <MobileNav />
        <main className="flex-1 p-4 md:p-6">
          <EmailVerificationBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
