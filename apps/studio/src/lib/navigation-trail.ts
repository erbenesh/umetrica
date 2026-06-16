import { matchPath } from 'react-router-dom';

export type NavCrumb = {
  href: string;
  label: string;
};

export type MobileBackTarget = {
  to: string;
  label?: string;
};

const ANCESTOR_TRAILS: Array<{ pattern: string; ancestors: NavCrumb[] }> = [
  { pattern: '/semantic', ancestors: [{ href: '/settings', label: 'Настройки' }] },
  {
    pattern: '/semantic/cubes/:cubeName',
    ancestors: [
      { href: '/settings', label: 'Настройки' },
      { href: '/semantic', label: 'Семантика' },
    ],
  },
  {
    pattern: '/semantic/views/:viewName',
    ancestors: [
      { href: '/settings', label: 'Настройки' },
      { href: '/semantic', label: 'Семантика' },
    ],
  },
  { pattern: '/dashboards/:id', ancestors: [{ href: '/dashboards', label: 'Дашборды' }] },
  { pattern: '/insights/:id', ancestors: [{ href: '/insights', label: 'AI-инсайты' }] },
  { pattern: '/settings/profile', ancestors: [{ href: '/settings', label: 'Настройки' }] },
  { pattern: '/settings/company', ancestors: [{ href: '/settings', label: 'Настройки' }] },
  { pattern: '/settings/billing', ancestors: [{ href: '/settings', label: 'Настройки' }] },
  { pattern: '/settings/privacy', ancestors: [{ href: '/settings', label: 'Настройки' }] },
  { pattern: '/settings/security', ancestors: [{ href: '/settings', label: 'Настройки' }] },
  { pattern: '/settings/connections', ancestors: [{ href: '/settings', label: 'Настройки' }] },
  {
    pattern: '/settings/audit',
    ancestors: [
      { href: '/settings', label: 'Настройки' },
      { href: '/settings/company', label: 'Компания' },
    ],
  },
  {
    pattern: '/settings/sso',
    ancestors: [
      { href: '/settings', label: 'Настройки' },
      { href: '/settings/company', label: 'Компания' },
    ],
  },
  {
    pattern: '/settings/enterprise/llm',
    ancestors: [
      { href: '/settings', label: 'Настройки' },
      { href: '/settings/billing', label: 'Биллинг' },
    ],
  },
  { pattern: '/insights/settings', ancestors: [{ href: '/insights', label: 'AI-инсайты' }] },
  { pattern: '/insights/history', ancestors: [{ href: '/insights', label: 'AI-инсайты' }] },
  { pattern: '/settings', ancestors: [{ href: '/', label: 'Главная' }] },
  { pattern: '/access-denied', ancestors: [{ href: '/settings', label: 'Настройки' }] },
];

function billingAncestors(pathname: string): NavCrumb[] | null {
  if (!pathname.startsWith('/settings/billing/') || pathname === '/settings/billing') {
    return null;
  }

  const ancestors: NavCrumb[] = [
    { href: '/settings', label: 'Настройки' },
    { href: '/settings/billing', label: 'Биллинг' },
  ];

  if (pathname === '/settings/billing/plans') {
    return ancestors;
  }

  if (pathname === '/settings/billing/payment') {
    return ancestors;
  }

  if (pathname === '/settings/billing/invoices') {
    return ancestors;
  }

  return ancestors;
}

function connectionsAncestors(pathname: string): NavCrumb[] | null {
  if (!pathname.startsWith('/settings/connections/') || pathname === '/settings/connections') {
    return null;
  }

  return [
    { href: '/settings', label: 'Настройки' },
    { href: '/settings/connections', label: 'Источники данных' },
  ];
}

export function resolveAncestorTrail(pathname: string): NavCrumb[] {
  for (const entry of ANCESTOR_TRAILS) {
    if (matchPath({ path: entry.pattern, end: true }, pathname)) {
      return entry.ancestors;
    }
  }

  const billing = billingAncestors(pathname);
  if (billing) return billing;

  const connections = connectionsAncestors(pathname);
  if (connections) return connections;

  return [];
}

export function resolveMobileBack(pathname: string): MobileBackTarget | null {
  const trail = resolveAncestorTrail(pathname);
  if (trail.length === 0) return null;

  const last = trail[trail.length - 1]!;
  return { to: last.href, label: last.label };
}
