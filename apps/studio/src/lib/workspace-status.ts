import type { OrgDataMode, TrustCapabilities } from '@sellerpool/core';
import { getBillingPlan, type BillingPlanId } from '@sellerpool/core';

import type { PrivacySettingsResponse } from '@/lib/privacy-api';
import { formatParticipationDate } from '@/lib/benchmark-participation';
import { connectionCabinetLabel } from '@/lib/connection-format';

export type WorkspaceStatusItem = {
  label: string;
  value: string;
  href?: string;
  tone?: 'default' | 'muted' | 'accent' | 'warning';
};

export type PageDocProp = {
  label: string;
  value: string;
  href?: string;
};

function billingPlanName(planId?: string): string {
  if (!planId) return '—';
  if (planId === 'starter' || planId === 'pro' || planId === 'enterprise') {
    return getBillingPlan(planId as BillingPlanId).name;
  }
  return planId;
}

export function privacyBenchmarkHint(privacy?: PrivacySettingsResponse | null): string {
  if (!privacy) return 'Загрузка…';

  if (!privacy.benchmarkOptIn) {
    return 'Бенчмарк-пул выключен';
  }

  if (!privacy.benchmarkReceiving) {
    const until = formatParticipationDate(privacy.benchmarkWarmupEndsAt);
    return until ? `Прогрев до ${until}` : 'Идёт прогрев пула';
  }

  const pool =
    typeof privacy.benchmarkPoolParticipants === 'number'
      ? ` · ${privacy.benchmarkPoolParticipants} в пуле`
      : '';

  return `Пул «${privacy.marketCategory}» включён${pool}`;
}

export function dataModeLabel(dataMode?: OrgDataMode): string {
  return dataMode === 'live' ? 'Ваши продажи' : 'Демо-данные';
}

export function buildHomeDocProps(input: {
  orgName?: string;
  dataMode?: OrgDataMode;
  billing?: { creditsUsed: number; creditsTotal: number; planId?: string } | null;
  canManage?: boolean;
}): PageDocProp[] {
  const canManage = input.canManage !== false;
  const items: PageDocProp[] = [];

  if (input.orgName) {
    items.push({ label: 'Магазин', value: input.orgName });
  }

  items.push({ label: 'Данные', value: dataModeLabel(input.dataMode) });

  if (input.billing) {
    if (canManage && input.billing.planId) {
      items.push({
        label: 'Тариф',
        value: billingPlanName(input.billing.planId),
        href: '/settings/billing',
      });
    }

    items.push({
      label: 'AI-кредиты',
      value: `${input.billing.creditsUsed} / ${input.billing.creditsTotal}`,
      href: canManage ? '/settings/billing' : undefined,
    });
  }

  items.push({ label: 'Инсайты', value: '→', href: '/insights' });
  items.push({ label: 'Период', value: '30 дней' });

  return items;
}

export function buildWorkspaceStatusItems(input: {
  dataMode?: OrgDataMode;
  connections?: { items: Parameters<typeof connectionCabinetLabel>[0] };
  privacy?: PrivacySettingsResponse | null;
  billing?: { creditsUsed: number; creditsTotal: number; planId?: string } | null;
  capabilities?: TrustCapabilities;
  canManage?: boolean;
}): WorkspaceStatusItem[] {
  const items: WorkspaceStatusItem[] = [];

  const isLive = input.dataMode === 'live';
  const canManage = input.canManage !== false;

  items.push({
    label: 'Данные',
    value: dataModeLabel(input.dataMode),
    href: canManage ? (isLive ? '/settings/connections' : '/onboarding/connect') : undefined,
    tone: isLive ? 'default' : 'accent',
  });

  items.push({
    label: 'Кабинет',
    value: connectionCabinetLabel(input.connections?.items ?? []),
    href: canManage ? '/settings/connections' : undefined,
    tone: isLive ? 'default' : 'muted',
  });

  items.push({
    label: 'Бенчмарки',
    value: privacyBenchmarkHint(input.privacy),
    href: '/settings/privacy',
    tone: input.privacy?.benchmarkReceiving ? 'default' : 'muted',
  });

  items.push({
    label: 'Доверие',
    value: isLive ? 'Политика и обработка данных' : 'Как устроена конфиденциальность',
    href: '/settings/privacy',
    tone: 'muted',
  });

  if (input.billing && canManage) {
    if (input.billing.planId) {
      items.push({
        label: 'Тариф',
        value: billingPlanName(input.billing.planId),
        href: '/settings/billing',
      });
    }

    items.push({
      label: 'AI-кредиты',
      value: `${input.billing.creditsUsed} / ${input.billing.creditsTotal}`,
      href: '/settings/billing',
      tone: input.billing.creditsUsed >= input.billing.creditsTotal ? 'warning' : 'default',
    });
  }

  if (input.privacy?.marketCategory) {
    items.push({
      label: 'Категория',
      value: input.privacy.marketCategory,
      href: '/settings/privacy',
    });
  }

  return items;
}
