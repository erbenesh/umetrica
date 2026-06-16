import { matchPath } from 'react-router-dom';

export type MobileBackTarget = {
  to: string;
  label?: string;
};

const MOBILE_BACK: Array<{ pattern: string; back: MobileBackTarget }> = [
  { pattern: '/semantic/cubes/:cubeName', back: { to: '/semantic', label: 'Семантика' } },
  { pattern: '/semantic/views/:viewName', back: { to: '/semantic', label: 'Семантика' } },
  { pattern: '/dashboards/:id', back: { to: '/dashboards', label: 'Дашборды' } },
  { pattern: '/insights/:id', back: { to: '/insights', label: 'AI-инсайты' } },
  { pattern: '/settings/profile', back: { to: '/settings', label: 'Настройки' } },
  { pattern: '/settings/company', back: { to: '/settings', label: 'Настройки' } },
  { pattern: '/settings/billing', back: { to: '/settings', label: 'Настройки' } },
  { pattern: '/settings/privacy', back: { to: '/settings', label: 'Настройки' } },
  { pattern: '/settings/security', back: { to: '/settings', label: 'Настройки' } },
  { pattern: '/settings/connections', back: { to: '/settings', label: 'Настройки' } },
  { pattern: '/settings/audit', back: { to: '/settings/company', label: 'Компания' } },
  { pattern: '/settings/sso', back: { to: '/settings/company', label: 'Компания' } },
  { pattern: '/insights/settings', back: { to: '/insights', label: 'AI-инсайты' } },
  { pattern: '/insights/history', back: { to: '/insights', label: 'AI-инсайты' } },
];

export function resolveMobileBack(pathname: string): MobileBackTarget | null {
  for (const entry of MOBILE_BACK) {
    if (matchPath({ path: entry.pattern, end: true }, pathname)) {
      return entry.back;
    }
  }

  if (pathname.startsWith('/settings/billing/') && pathname !== '/settings/billing') {
    return { to: '/settings/billing', label: 'Биллинг' };
  }

  if (pathname.startsWith('/settings/connections/') && pathname !== '/settings/connections') {
    return { to: '/settings/connections', label: 'Источники' };
  }

  return null;
}
