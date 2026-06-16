import {
  BENCHMARK_POOL_CONTRIBUTION_LABEL,
  CONTRIBUTION_PATH_COPY,
  TrustPolicyViewSchema,
  type PrivacySettingsView,
  type TrustPolicyView,
} from '@sellerpool/core';
import { Check, KeyRound, Lock, Minus, Shield, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export { CONTRIBUTION_PATH_COPY, TRUST_FAQ } from '@sellerpool/core';

export function parseTrustPolicy(raw: unknown): TrustPolicyView | null {
  const parsed = TrustPolicyViewSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function trustPanelItemsForPath(
  path: keyof typeof CONTRIBUTION_PATH_COPY
): Array<{ icon: LucideIcon; text: string; muted?: boolean }> {
  const copy = CONTRIBUTION_PATH_COPY[path];
  return copy.trustPoints.map((text, index) => ({
    icon: index === copy.trustPoints.length - 1 && path !== 'marketplace_api' ? Minus : Check,
    text,
    muted: text.includes('бенчмарк') || text.includes('соглас'),
  }));
}

export function dataHandlingSummary(trust: TrustPolicyView): string[] {
  const lines: string[] = [];

  if (trust.dataHandling.encryptionAtRest) {
    lines.push('Ключи и пароли хранятся в зашифрованном виде');
  }

  if (!trust.dataHandling.storesRawSellerData) {
    lines.push('Сейчас подключены только рыночные данные — личный кабинет не передаётся');
  } else if (trust.contributionPath === 'file_import') {
    lines.push('Файл обрабатывается и может быть удалён сразу после импорта');
  } else if (trust.contributionPath === 'database') {
    lines.push('Доступ к БД только на чтение — витрина остаётся у вас');
  } else {
    lines.push('API-ключ только на чтение статистики');
  }

  if (trust.dataHandling.benchmarkUsesAnonymizedAggregatesOnly) {
    lines.push(
      `В бенчмарки — только обезличенные агрегаты (${BENCHMARK_POOL_CONTRIBUTION_LABEL})`
    );
  }

  return lines;
}

export function capabilityStatusLines(
  privacy: PrivacySettingsView,
  trust: TrustPolicyView
): Array<{ icon: LucideIcon; label: string; on: boolean }> {
  const { capabilities } = trust;
  return [
    { icon: Shield, label: 'Личные дашборды', on: capabilities.personalDashboards },
    { icon: Shield, label: 'Инсайты по кабинету', on: capabilities.personalInsights },
    { icon: Users, label: 'Рыночные тренды', on: capabilities.marketInsights },
    { icon: Users, label: 'Бенчмарки сегмента', on: capabilities.benchmarkInsights },
    { icon: KeyRound, label: 'Автообновление', on: capabilities.autoRefresh },
    { icon: Lock, label: 'Вклад в пул', on: privacy.benchmarkOptIn },
  ];
}
