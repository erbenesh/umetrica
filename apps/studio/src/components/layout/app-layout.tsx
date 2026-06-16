import { Home, LayoutDashboard, LogOut, Settings, Sparkles, Users } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { OrgSwitcher } from '@/components/layout/org-switcher';
import { useMe } from '@/hooks/use-me';
import { signOut } from '@/lib/auth-client';
import { BRAND_MARK, BRAND_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  viewer: 'Наблюдатель',
  member: 'Участник',
};

const navItems = [
  { to: '/', label: 'Главная', icon: Home, end: true },
  { to: '/insights', label: 'AI-инсайты', icon: Sparkles },
  { to: '/dashboards', label: 'Дашборды', icon: LayoutDashboard },
  { to: '/team', label: 'Команда', icon: Users },
  { to: '/settings', label: 'Настройки', icon: Settings },
];

function roleLabel(role?: string) {
  if (!role) return 'Участник';
  return ROLE_LABELS[role] ?? role;
}

function userInitial(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || '?';
  return source.charAt(0).toUpperCase();
}

function SidebarNavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cn('nav__item', isActive && 'is-active')}
    >
      <Icon className="nav__icon" strokeWidth={1.75} />
      <span className="nav__label">{label}</span>
    </NavLink>
  );
}

export function DesktopSidebar() {
  const { data: me } = useMe();
  const userName = me?.user?.name ?? 'Профиль';
  const userEmail = me?.user?.email ?? '';

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <Link to="/" className="sidebar-app-link">
          <span className="brand__mark">{BRAND_MARK}</span>
          <span className="brand__name">{BRAND_NAME}</span>
        </Link>
        <OrgSwitcher />
      </div>

      <div className="sidebar__scroll">
        <p className="sidebar__section-label">Навигация</p>
        <nav className="nav">
          {navItems.map((item) => (
            <SidebarNavItem key={item.to} {...item} />
          ))}
        </nav>
      </div>

      <div className="sidebar__footer">
        <div className="sidebar-user">
          <span className="sidebar-user__avatar">{userInitial(userName, userEmail)}</span>
          <div className="sidebar-user__meta">
            <span className="sidebar-user__name">{userName}</span>
            <span className="sidebar-user__role">{roleLabel(me?.role)}</span>
          </div>
          <button
            type="button"
            className="sidebar-user__action"
            aria-label="Выйти"
            onClick={() => signOut()}
          >
            <LogOut className="size-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav className="tabbar" aria-label="Основная навигация">
      <div className="tabbar__inner">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn('tabbar__item', isActive && 'is-active')}
          >
            <item.icon className="tabbar__icon" strokeWidth={1.75} />
            <span>{item.label === 'AI-инсайты' ? 'Инсайты' : item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function AppLayout() {
  return (
    <div className="app-frame">
      <DesktopSidebar />
      <div className="app-main">
        <EmailVerificationBanner />
        <main className="app-content">
          <Outlet />
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
