import type { OrgDataMode } from '@sellerpool/core';

import type { PrivacySettingsResponse } from '@/lib/privacy-api';
import { formatParticipationDate } from '@/lib/benchmark-participation';

export type PageDocProp = {
  label: string;
  value: string;
  href?: string;
};

export function privacyBenchmarkHint(privacy?: PrivacySettingsResponse | null): string {
  if (!privacy) return 'Загрузка…';

  if (!privacy.benchmarkOptIn) {
    return 'Выключены';
  }

  if (!privacy.benchmarkReceiving) {
    const until = formatParticipationDate(privacy.benchmarkWarmupEndsAt);
    return until ? `Прогрев до ${until}` : 'Идёт прогрев';
  }

  return `Включены · ${privacy.marketCategory}`;
}

export function dataModeLabel(dataMode?: OrgDataMode): string {
  return dataMode === 'live' ? 'Ваши продажи' : 'Демо';
}

export function buildHomeDocProps(input: {
  orgName?: string;
  dataMode?: OrgDataMode;
}): PageDocProp[] {
  const items: PageDocProp[] = [];

  if (input.orgName) {
    items.push({ label: 'Магазин', value: input.orgName });
  }

  items.push({ label: 'Данные', value: dataModeLabel(input.dataMode) });
  items.push({ label: 'Период', value: '30 дней' });

  return items;
}

export function buildInsightsDocProps(input: {
  itemCount: number;
  billing?: { creditsUsed: number; creditsTotal: number } | null;
  canManage?: boolean;
}): PageDocProp[] {
  const items: PageDocProp[] = [{ label: 'В ленте', value: String(input.itemCount) }];

  if (input.canManage !== false && input.billing) {
    items.push({
      label: 'AI-кредиты',
      value: `${input.billing.creditsUsed} / ${input.billing.creditsTotal}`,
      href: '/settings/billing',
    });
  }

  return items;
}
