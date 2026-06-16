export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'sellerpool-theme';
const LEGACY_STORAGE_KEY = 'umetrica-theme';

export function getStoredTheme(): Theme | null {
  const value =
    localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

export function resolveTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#0b0d11' : '#f6f8fc',
  );
}

export function initTheme(): Theme {
  const theme = resolveTheme();
  applyTheme(theme);
  return theme;
}

export function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  applyTheme(theme);
}

export function toggleTheme(current: Theme): Theme {
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function readCssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
