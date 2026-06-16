import { Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { InsightSourceBadge } from '@/components/doc/insight-source-badge';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { Button } from '@/components/ui/button';
import {
  BENCHMARK_OPT_OUT_COOLDOWN_DAYS,
  BENCHMARK_WARMUP_DAYS,
  formatParticipationDate,
} from '@/lib/benchmark-participation';
import { usePrivacySettings, useUpdatePrivacySettings } from '@/hooks/use-privacy';

const MARKET_CATEGORIES = [
  'Дом и текстиль',
  'Одежда',
  'Красота и здоровье',
  'Электроника',
  'Другое',
];

export function SettingsPrivacyPage() {
  const { data, isLoading } = usePrivacySettings();
  const updatePrivacy = useUpdatePrivacySettings();
  const [benchmarkOptIn, setBenchmarkOptIn] = useState(false);
  const [category, setCategory] = useState(MARKET_CATEGORIES[0]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setBenchmarkOptIn(data.benchmarkOptIn);
    setCategory(data.marketCategory);
  }, [data]);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setNotice(null);

    try {
      const result = await updatePrivacy.mutateAsync({
        benchmarkOptIn,
        marketCategory: category,
      });
      setSaved(true);
      if ('notice' in result && typeof result.notice === 'string') {
        setNotice(result.notice);
      }
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const warmupLabel = formatParticipationDate(data?.benchmarkWarmupEndsAt);
  const contributionEndsLabel = formatParticipationDate(data?.benchmarkContributionEndsAt);
  const savedOptIn = data?.benchmarkOptIn ?? false;
  const isDraft = data !== undefined && benchmarkOptIn !== savedOptIn;
  const poolCount = data?.benchmarkPoolParticipants;

  return (
    <DocPage
      title="Данные и бенчмарки"
      lead="Честный пул: смотреть бенчмарки можно только если делитесь обезличенными агрегатами"
      icon={Shield}
      back="auto"
      mobileTitle="Конфиденциальность"
    >
      <DocBlock title="Типы инсайтов">
        <SettingsGroup>
          <SettingsRow label="">
            <div>
              <InsightSourceBadge source="tenant" className="mb-1" />
              <div className="text-xs text-muted-foreground">
                Только ваша компания · дашборды и аномалии по кабинету
              </div>
            </div>
          </SettingsRow>
          <SettingsRow label="">
            <div>
              <InsightSourceBadge source="market" className="mb-1" />
              <div className="text-xs text-muted-foreground">
                Агрегаты категории · без вашего кабинета · публичные и обезличенные данные
              </div>
            </div>
          </SettingsRow>
          <SettingsRow label="">
            <div>
              <InsightSourceBadge source="benchmark" className="mb-1" />
              <div className="text-xs text-muted-foreground">
                «Среди похожих селлеров» на Pro · единый переключатель ниже: получаете и отдаёте в
                пул
              </div>
            </div>
          </SettingsRow>
        </SettingsGroup>
      </DocBlock>

      <DocBlock title="Бенчмарк-пул">
        <SettingsGroup>
          <SettingsRow
            label="Получать и делиться"
            hint={`Обезличенные сводные метрики (маржа, цена, оборот) идут в сегмент «${category}». Сырые данные и SKU не передаются.`}
            action={
              <input
                type="checkbox"
                checked={benchmarkOptIn}
                onChange={(event) => setBenchmarkOptIn(event.target.checked)}
                aria-label="Участие в бенчмарк-пуле"
                disabled={isLoading}
              />
            }
          />
        </SettingsGroup>

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

      <DocBlock>
        {saved ? <p className="mb-3 text-xs text-muted-foreground">Сохранено</p> : null}
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
