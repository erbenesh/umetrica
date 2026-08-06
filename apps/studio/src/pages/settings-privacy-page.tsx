import { Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { ServicePolicyPillars } from '@/components/doc/service-policy-pillars';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { TrustFaq } from '@/components/doc/trust-faq';
import { Button } from '@/components/ui/button';
import {
  BENCHMARK_POOL_CONTRIBUTION_LABEL,
  formatBenchmarkPoolThresholdHint,
} from '@sellerpool/core';
import {
  BENCHMARK_WARMUP_DAYS,
  formatParticipationDate,
} from '@/lib/benchmark-participation';
import { MARKET_CATEGORIES, DEFAULT_MARKET_CATEGORY } from '@/lib/market-categories';
import { useCanWriteDashboards } from '@/hooks/use-me';
import { usePrivacySettings, useUpdatePrivacySettings } from '@/hooks/use-privacy';

export function SettingsPrivacyPage() {
  const canManage = useCanWriteDashboards();
  const { data, isLoading } = usePrivacySettings();
  const updatePrivacy = useUpdatePrivacySettings();
  const [benchmarkOptIn, setBenchmarkOptIn] = useState(false);
  const [category, setCategory] = useState<string>(DEFAULT_MARKET_CATEGORY);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trust = data?.trustPolicy;
  const canJoinBenchmarkPool = trust?.capabilities.personalInsights ?? false;

  useEffect(() => {
    if (!data) return;
    setBenchmarkOptIn(data.benchmarkOptIn);
    setCategory(data.marketCategory);
  }, [data]);

  const handleSave = async () => {
    setError(null);
    setNotice(null);

    try {
      const result = await updatePrivacy.mutateAsync({
        benchmarkOptIn,
        marketCategory: category,
      });
      if ('notice' in result && typeof result.notice === 'string') {
        setNotice(result.notice);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const warmupLabel = formatParticipationDate(data?.benchmarkWarmupEndsAt);
  const savedOptIn = data?.benchmarkOptIn ?? false;
  const isDraft = data !== undefined && benchmarkOptIn !== savedOptIn;
  const poolCount = data?.benchmarkPoolParticipants;

  return (
    <DocPage
      title="Данные и бенчмарки"
      lead="Категория для рыночных сигналов и участие в сравнении с сегментом."
      icon={Shield}
      back="auto"
      mobileTitle="Конфиденциальность"
    >
      {trust ? (
        <DocBlock title="Сейчас у вас">
          <p className="m-0 mb-3 text-sm text-foreground">{trust.contributionLabel}</p>
          <p className="m-0 mb-4 text-[13px] text-muted-foreground">{trust.contributionHint}</p>
          <ServicePolicyPillars pillars={trust.pillars} />
        </DocBlock>
      ) : null}

      <DocBlock title="Бенчмарк-пул">
        <DocCallout variant="info" className="mb-3">
          {formatBenchmarkPoolThresholdHint(category, poolCount)}. В пул попадают только агрегаты:{' '}
          {BENCHMARK_POOL_CONTRIBUTION_LABEL}. Детали — в блоке ниже.
        </DocCallout>

        <SettingsGroup>
          <SettingsRow
            label="Сравнение с сегментом"
            hint={
              benchmarkOptIn
                ? isDraft
                  ? `После сохранения — категория «${category}», прогрев ${BENCHMARK_WARMUP_DAYS} дн.`
                  : data?.benchmarkReceiving
                    ? `Включено · категория «${category}»`
                    : warmupLabel
                      ? `Прогрев до ${warmupLabel}`
                      : `Включено · категория «${category}»`
                : 'Выключено — бенчмарк-инсайты недоступны'
            }
            action={
              <input
                type="checkbox"
                checked={benchmarkOptIn}
                onChange={(event) => setBenchmarkOptIn(event.target.checked)}
                aria-label="Участие в бенчмарк-пуле"
                disabled={isLoading || (!canJoinBenchmarkPool && !benchmarkOptIn)}
              />
            }
          />
        </SettingsGroup>

        {!canJoinBenchmarkPool && !savedOptIn ? (
          <DocCallout variant="info" className="mt-3">
            {canManage ? (
              <>
                Чтобы участвовать в пуле, сначала подключите{' '}
                <Link to="/onboarding/connect" className="text-primary hover:underline">
                  свои данные
                </Link>{' '}
                — файл, API маркетплейса или базу. Без вклада сравнение с сегментом недоступно.
              </>
            ) : (
              <>
                Чтобы участвовать в пуле, администратор компании должен подключить источники данных.
              </>
            )}
          </DocCallout>
        ) : null}

        {notice ? (
          <DocCallout variant="info" className="mt-3">
            {notice}
          </DocCallout>
        ) : null}
      </DocBlock>

      <DocBlock title="Категория на маркетплейсе">
        <FormField
          label="Для рыночных и бенчмарк-инсайтов"
          hint="Определяет сегмент сравнения при участии в пуле."
        >
          <select
            className="flex h-8 w-full max-w-md rounded-md border border-input bg-card px-2.5 text-[13px]"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={isLoading}
          >
            {MARKET_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FormField>
      </DocBlock>

      {trust ? (
        <DocBlock title="Частые вопросы">
          <TrustFaq items={trust.faq} />
          <p className="mt-3 text-xs text-muted-foreground">
            Нужен разбор вашего кейса?{' '}
            <Link to="/settings" className="text-primary hover:underline">
              Напишите в поддержку
            </Link>{' '}
            — учтём при развитии аналитики.
          </p>
        </DocBlock>
      ) : null}

      <DocBlock>
        {error ? <p className="mb-3 text-xs text-insight-warning">{error}</p> : null}
        <FormActions>
          <Button type="button" onClick={handleSave} disabled={updatePrivacy.isPending || isLoading}>
            {updatePrivacy.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </FormActions>
      </DocBlock>
    </DocPage>
  );
}
