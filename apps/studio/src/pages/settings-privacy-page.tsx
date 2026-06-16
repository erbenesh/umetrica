import { Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { InsightSourceBadge } from '@/components/doc/insight-source-badge';
import { ServicePolicyPillars } from '@/components/doc/service-policy-pillars';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { TrustFaq } from '@/components/doc/trust-faq';
import { Button } from '@/components/ui/button';
import {
  BENCHMARK_MIN_POOL_PARTICIPANTS,
  BENCHMARK_POOL_CONTRIBUTION_LABEL,
  formatBenchmarkPoolThresholdHint,
} from '@sellerpool/core';
import {
  BENCHMARK_OPT_OUT_COOLDOWN_DAYS,
  BENCHMARK_WARMUP_DAYS,
  formatParticipationDate,
} from '@/lib/benchmark-participation';
import { MARKET_CATEGORIES, DEFAULT_MARKET_CATEGORY } from '@/lib/market-categories';
import { capabilityStatusLines } from '@/lib/trust-policy-ui';
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
  const contributionEndsLabel = formatParticipationDate(data?.benchmarkContributionEndsAt);
  const savedOptIn = data?.benchmarkOptIn ?? false;
  const isDraft = data !== undefined && benchmarkOptIn !== savedOptIn;
  const poolCount = data?.benchmarkPoolParticipants;
  const capabilityLines = data && trust ? capabilityStatusLines(data, trust) : [];

  return (
    <DocPage
      title="Данные и бенчмарки"
      lead="Вы сами выбираете, что подключать. Бенчмарки — отдельное согласие и только обезличенные сводки."
      icon={Shield}
      back="auto"
      mobileTitle="Конфиденциальность"
    >
      {trust ? (
        <DocBlock title="Ваш режим данных">
          <p className="m-0 mb-3 text-[13px] text-muted-foreground">{trust.contributionHint}</p>
          <p className="m-0 mb-3 text-xs font-medium text-foreground">
            Сейчас: {trust.contributionLabel}
          </p>
          {capabilityLines.length > 0 ? (
            <ul className="m-0 mb-4 grid gap-1.5 p-0 list-none sm:grid-cols-2">
              {capabilityLines.map((line) => {
                const Icon = line.icon;
                return (
                  <li
                    key={line.label}
                    className={`flex items-center gap-2 text-[13px] ${line.on ? 'text-foreground' : 'text-muted-foreground/60'}`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {line.label}
                    <span className="text-xs">{line.on ? '· вкл.' : '· выкл.'}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <ServicePolicyPillars pillars={trust.pillars} />
        </DocBlock>
      ) : null}

      <DocBlock title="Типы инсайтов">
        <SettingsGroup>
          <SettingsRow label="">
            <div>
              <InsightSourceBadge source="tenant" className="mb-1" />
              <div className="text-xs text-muted-foreground">
                Только ваша компания · нужен файл, API или БД
              </div>
            </div>
          </SettingsRow>
          <SettingsRow label="">
            <div>
              <InsightSourceBadge source="market" className="mb-1" />
              <div className="text-xs text-muted-foreground">
                Тренды категории · без вашего кабинета · публичные и обезличенные данные
              </div>
            </div>
          </SettingsRow>
          <SettingsRow label="">
            <div>
              <InsightSourceBadge source="benchmark" className="mb-1" />
              <div className="text-xs text-muted-foreground">
                Сравнение с сегментом · отдельный переключатель: получаете и отдаёте в пул
              </div>
            </div>
          </SettingsRow>
        </SettingsGroup>
      </DocBlock>

      <DocBlock title="Бенчмарк-пул">
        <DocCallout variant="info" className="mb-3">
          {formatBenchmarkPoolThresholdHint(category, poolCount)}
          {' '}
          В пул уходит только: {BENCHMARK_POOL_CONTRIBUTION_LABEL}. SKU, артикулы и строки заказов не
          передаются. Бенчмарк-инсайты — от {BENCHMARK_MIN_POOL_PARTICIPANTS} участников в категории.
        </DocCallout>

        <SettingsGroup>
          <SettingsRow
            label="Получать и делиться"
            hint={`В пул категории «${category}»: ${BENCHMARK_POOL_CONTRIBUTION_LABEL}. SKU и строки заказов не передаются.`}
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

        <DocCallout variant="info" className="mt-3">
          {benchmarkOptIn ? (
            isDraft ? (
              <>
                После сохранения участие начнётся по категории «{category}»
                {typeof poolCount === 'number' ? ` · сейчас в пуле ${poolCount} селлеров` : ''}.{' '}
                Начнётся {BENCHMARK_WARMUP_DAYS}-дневный прогрев — агрегаты сразу пойдут в пул,
                просмотр бенчмарков откроется после него.
              </>
            ) : (
              <>
                Участие включено по категории «{category}»
                {typeof poolCount === 'number' ? ` · в пуле ${poolCount} селлеров` : ''}.{' '}
                {data?.benchmarkReceiving ? (
                  <>Бенчмарк-инсайты доступны.</>
                ) : warmupLabel ? (
                  <>
                    Период прогрева до {warmupLabel} — агрегаты уже идут в пул, просмотр откроется
                    через {BENCHMARK_WARMUP_DAYS} дн.
                  </>
                ) : (
                  <>
                    Идёт {BENCHMARK_WARMUP_DAYS}-дневный прогрев — агрегаты уже в пуле, просмотр
                    скоро откроется.
                  </>
                )}
              </>
            )
          ) : data?.benchmarkContributing && contributionEndsLabel ? (
            <>
              Просмотр бенчмарков выключен, но ваши агрегаты ещё в пуле до {contributionEndsLabel}{' '}
              ({BENCHMARK_OPT_OUT_COOLDOWN_DAYS} дн. охлаждения). Так нельзя «подглядеть и сразу
              выйти» — сообщество получает честную выборку.
            </>
          ) : (
            <>
              Выключено. Без участия бенчмарк-инсайты недоступны — включите переключатель, чтобы
              видеть сравнение с сегментом и помогать формировать пул для других.
            </>
          )}
        </DocCallout>

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
