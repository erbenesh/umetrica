import type { BillingPlanId } from './billing-schemas.js';
import type { PrivacySettings } from './schemas.js';

/** Days after opt-out when anonymized aggregates still stay in the pool */
export const BENCHMARK_OPT_OUT_COOLDOWN_DAYS = 14;

/** Days after opt-in before benchmark insights become visible */
export const BENCHMARK_WARMUP_DAYS = 3;

export function isBenchmarkPlanAllowed(planId: BillingPlanId | string) {
  return planId === 'pro' || planId === 'enterprise';
}

export function isBenchmarkContributor(settings: PrivacySettings, now = new Date()): boolean {
  if (settings.benchmarkOptIn) return true;

  if (settings.benchmarkOptOutUntil) {
    const until = new Date(settings.benchmarkOptOutUntil);
    if (!Number.isNaN(until.getTime()) && until > now) {
      return true;
    }
  }

  return false;
}

export function getBenchmarkWarmupEndsAt(settings: PrivacySettings): Date | null {
  if (!settings.benchmarkOptIn || !settings.benchmarkOptInAt) return null;

  const startedAt = new Date(settings.benchmarkOptInAt);
  if (Number.isNaN(startedAt.getTime())) return null;

  const endsAt = new Date(startedAt);
  endsAt.setDate(endsAt.getDate() + BENCHMARK_WARMUP_DAYS);
  return endsAt;
}

export function canReceiveBenchmarkParticipation(
  settings: PrivacySettings,
  now = new Date()
): boolean {
  if (!settings.benchmarkOptIn) return false;

  const warmupEndsAt = getBenchmarkWarmupEndsAt(settings);
  if (!warmupEndsAt) return true;

  return now >= warmupEndsAt;
}

export function getBenchmarkContributionEndsAt(settings: PrivacySettings): Date | null {
  if (settings.benchmarkOptIn || !settings.benchmarkOptOutUntil) return null;

  const until = new Date(settings.benchmarkOptOutUntil);
  return Number.isNaN(until.getTime()) ? null : until;
}

export function applyBenchmarkOptInChange(
  current: PrivacySettings,
  nextOptIn: boolean,
  now = new Date()
): PrivacySettings {
  if (nextOptIn === current.benchmarkOptIn) {
    return current;
  }

  if (nextOptIn) {
    return {
      ...current,
      benchmarkOptIn: true,
      benchmarkOptInAt: now.toISOString(),
      benchmarkOptOutUntil: null,
    };
  }

  const contributionEndsAt = new Date(now);
  contributionEndsAt.setDate(contributionEndsAt.getDate() + BENCHMARK_OPT_OUT_COOLDOWN_DAYS);

  return {
    ...current,
    benchmarkOptIn: false,
    benchmarkOptOutUntil: contributionEndsAt.toISOString(),
  };
}

export function buildBenchmarkParticipationView(
  settings: PrivacySettings,
  benchmarkPoolParticipants: number,
  now = new Date()
) {
  return {
    ...settings,
    benchmarkPoolParticipants,
    benchmarkContributing: isBenchmarkContributor(settings, now),
    benchmarkReceiving: canReceiveBenchmarkParticipation(settings, now),
    benchmarkWarmupEndsAt: getBenchmarkWarmupEndsAt(settings)?.toISOString() ?? null,
    benchmarkContributionEndsAt: getBenchmarkContributionEndsAt(settings)?.toISOString() ?? null,
  };
}

export type BenchmarkParticipationView = ReturnType<typeof buildBenchmarkParticipationView>;
