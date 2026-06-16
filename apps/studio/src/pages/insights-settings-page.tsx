import { Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CheckboxRow } from '@/components/doc/checkbox-row';
import {
  DataCell,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from '@/components/doc/data-table';
import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions } from '@/components/doc/form-field';
import { InsightSourceBadge } from '@/components/doc/insight-source-badge';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useInsightSettings, useUpdateInsightSettings } from '@/hooks/use-insights';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { usePrivacySettings } from '@/hooks/use-privacy';
import { BENCHMARK_WARMUP_DAYS, formatParticipationDate } from '@/lib/benchmark-participation';
import type { InsightSettings } from '@sellerpool/core';

export function InsightsSettingsPage() {
  const canWrite = useCanWriteDashboards();
  const { data: me } = useMe();
  const personalInsightsAllowed = me?.trustCapabilities?.personalInsights ?? false;
  const { data, isLoading, error } = useInsightSettings();
  const { data: privacy } = usePrivacySettings();
  const updateSettings = useUpdateInsightSettings();
  const [form, setForm] = useState<InsightSettings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const toggleMetric = (key: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            metrics: prev.metrics.map((item) =>
              item.key === key ? { ...item, enabled: !item.enabled } : item
            ),
          }
        : prev
    );
  };

  const handleSave = async () => {
    if (!form) return;
    await updateSettings.mutateAsync(form);
  };

  return (
    <DocPage
      title="Настройки AI-инсайтов"
      lead="Автопроверки и метрики для мониторинга · owner/admin"
      icon={Sparkles}
      back="auto"
      mobileTitle="Настройки AI"
    >
      {isLoading ? (
        <Card className="mb-4">
          <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Загрузка настроек...
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="mb-4">
          <CardContent className="p-3 text-xs text-destructive">
            {error instanceof Error ? error.message : 'Ошибка загрузки'}
          </CardContent>
        </Card>
      ) : null}

      {form ? (
        <>
          <DocBlock title="Типы инсайтов">
            <div className="space-y-2">
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={form.sources.tenant}
                  disabled={!canWrite || !personalInsightsAllowed}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sources: { ...form.sources, tenant: event.target.checked },
                    })
                  }
                />
                <span>
                  <InsightSourceBadge source="tenant" /> — аномалии по кабинету
                </span>
              </CheckboxRow>
              {!personalInsightsAllowed ? (
                <p className="text-xs text-muted-foreground">
                  Подключите{' '}
                  <Link to="/onboarding/connect" className="text-primary hover:underline">
                    файл, API или БД
                  </Link>{' '}
                  — без своих данных инсайты по кабинету недоступны.
                </p>
              ) : null}
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={form.sources.market}
                  disabled={!canWrite}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sources: { ...form.sources, market: event.target.checked },
                    })
                  }
                />
                <span>
                  <InsightSourceBadge source="market" /> — тренды категории (без API)
                </span>
              </CheckboxRow>
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={form.sources.benchmark}
                  disabled={
                    !canWrite || !privacy?.benchmarkOptIn || !privacy?.benchmarkReceiving
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sources: { ...form.sources, benchmark: event.target.checked },
                    })
                  }
                />
                <span>
                  <InsightSourceBadge source="benchmark" /> — сравнение с пулом селлеров (при opt-in)
                </span>
              </CheckboxRow>
              <p className="text-xs text-muted-foreground">
                {!privacy?.benchmarkOptIn ? (
                  <>
                    Включите «Получать и делиться» в{' '}
                    <Link to="/settings/privacy" className="text-primary hover:underline">
                      конфиденциальности
                    </Link>{' '}
                    — без участия в пуле бенчмарки недоступны.
                  </>
                ) : !privacy.benchmarkReceiving && privacy.benchmarkWarmupEndsAt ? (
                  <>
                    Прогрев до {formatParticipationDate(privacy.benchmarkWarmupEndsAt)} (
                    {BENCHMARK_WARMUP_DAYS} дн.) — агрегаты уже в пуле, инсайты скоро.
                  </>
                ) : (
                  <>
                    Источник синхронизирован с участием в{' '}
                    <Link to="/settings/privacy" className="text-primary hover:underline">
                      бенчмарк-пуле
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
          </DocBlock>

          <DocBlock title="Автопроверки">
            <SettingsGroup>
              <SettingsRow label="Расписание" hint="Ежедневно в 09:00 МСК · пока API запущен">
                <select
                  className="h-8 min-w-[140px] rounded-md border border-input bg-card px-2 text-[13px]"
                  value={form.schedule}
                  disabled={!canWrite}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      schedule: event.target.value as InsightSettings['schedule'],
                    })
                  }
                >
                  <option value="daily">Ежедневно 09:00</option>
                  <option value="12h">Каждые 12 ч</option>
                  <option value="manual">Вручную</option>
                </select>
              </SettingsRow>
            </SettingsGroup>
            <CheckboxRow className="mt-3">
              <input
                type="checkbox"
                checked={form.emailAlerts}
                disabled={!canWrite}
                onChange={(event) => setForm({ ...form, emailAlerts: event.target.checked })}
              />
              <span>Email при высокой значимости</span>
            </CheckboxRow>
          </DocBlock>

          <DocBlock title="Метрики для мониторинга">
            <DataTable>
              <DataTableHead>
                <DataTableTh>Мера</DataTableTh>
                <DataTableTh className="w-[100px] text-center">Включена</DataTableTh>
              </DataTableHead>
              <DataTableBody>
                {form.metrics.map((metric) => (
                  <DataTableRow key={metric.key}>
                    <DataTableTd>
                      <DataCell title={metric.key} />
                    </DataTableTd>
                    <DataTableTd className="text-center">
                      <CheckboxRow compact center>
                        <input
                          type="checkbox"
                          checked={metric.enabled}
                          disabled={!canWrite}
                          onChange={() => toggleMetric(metric.key)}
                          aria-label={`Включить ${metric.key}`}
                        />
                      </CheckboxRow>
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </DocBlock>

          <DocBlock>
            <FormActions>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canWrite || updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Link to="/insights">
                <Button variant="ghost" type="button">
                  Отмена
                </Button>
              </Link>
            </FormActions>
            <p className="mt-3 text-[13px] text-muted-foreground">
              <Link to="/insights/history" className="text-primary hover:underline">
                История прогонов →
              </Link>{' '}
              ·{' '}
              <Link to="/settings/billing" className="text-primary hover:underline">
                AI-кредиты
              </Link>
            </p>
          </DocBlock>
        </>
      ) : null}
    </DocPage>
  );
}
