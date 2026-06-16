import { FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { CheckboxRow } from '@/components/doc/checkbox-row';
import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { TrustPanel } from '@/components/doc/trust-panel';
import { Button } from '@/components/ui/button';
import { trustPanelItemsForPath } from '@/lib/trust-policy-ui';
import { useReuploadCsvConnection, useUploadCsvConnection } from '@/hooks/use-connections';
import { connectionProviderLabel } from '@/lib/connection-format';

const PROVIDER_MAP: Record<string, string> = {
  Wildberries: 'wildberries',
  Ozon: 'ozon',
  'Яндекс Маркет': 'yandex_market',
};

const PROVIDER_LABELS: Record<string, string> = {
  wildberries: 'Wildberries',
  ozon: 'Ozon',
  yandex_market: 'Яндекс Маркет',
};

const REPORT_TYPE_MAP: Record<string, string> = {
  sales: 'sales',
  orders: 'orders',
  stock: 'stock',
};

type UploadCsvLocationState = {
  connectionId?: string;
  provider?: string;
  reportType?: string;
};

type UploadCsvFormProps = {
  variant: 'onboarding' | 'settings';
  connectionId?: string;
  initialProvider?: string;
  initialReportType?: string;
};

function UploadCsvForm({ variant, connectionId, initialProvider, initialReportType }: UploadCsvFormProps) {
  const navigate = useNavigate();
  const uploadCsv = useUploadCsvConnection();
  const reuploadCsv = useReuploadCsvConnection();
  const fileRef = useRef<HTMLInputElement>(null);
  const [marketplace, setMarketplace] = useState(
    PROVIDER_LABELS[initialProvider ?? 'wildberries'] ?? 'Wildberries'
  );
  const [reportType, setReportType] = useState(initialReportType ?? 'sales');
  const [deleteAfter, setDeleteAfter] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOnboarding = variant === 'onboarding';
  const isUpdate = Boolean(connectionId);
  const isPending = uploadCsv.isPending || reuploadCsv.isPending;

  const handleSubmit = async () => {
    setError(null);
    if (!file) {
      setError('Выберите файл');
      return;
    }

    const payload = {
      file,
      provider: PROVIDER_MAP[marketplace] ?? 'wildberries',
      reportType: REPORT_TYPE_MAP[reportType] ?? reportType,
      deleteAfterImport: deleteAfter,
    };

    try {
      const result = connectionId
        ? await reuploadCsv.mutateAsync({ connectionId, ...payload })
        : await uploadCsv.mutateAsync(payload);

      navigate(isOnboarding ? '/' : '/settings/connections', {
        state: { importFlash: result.import.message },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить');
    }
  };

  const content = (
    <>
      {isUpdate ? (
        <p className="mb-4 text-[13px] text-muted-foreground">
          Обновление подключения {connectionProviderLabel(initialProvider ?? 'wildberries')} — данные на
          главной и в инсайтах будут заменены.
        </p>
      ) : null}

      <div className="space-y-4">
        <FormField label="Маркетплейс">
          <select
            className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
            value={marketplace}
            onChange={(event) => setMarketplace(event.target.value)}
          >
            <option>Wildberries</option>
            <option>Ozon</option>
            <option>Яндекс Маркет</option>
          </select>
        </FormField>

        <FormField label="Тип отчёта">
          <select
            className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
          >
            <option value="sales">Продажи по артикулам</option>
            <option value="orders">Заказы</option>
            <option value="stock">Остатки</option>
          </select>
        </FormField>

        <FormField label="Файл CSV или XLSX">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileSpreadsheet className="size-6" />
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <Button variant="outline" size="sm" type="button" onClick={() => fileRef.current?.click()}>
                <Upload className="size-3.5" />
                {file ? 'Сменить файл' : 'Выбрать файл'}
              </Button>
              <p className="text-xs text-muted-foreground">
                {file?.name ?? 'До 20 МБ · инструкция: Кабинет → Аналитика → Скачать'}
              </p>
            </div>
          </div>
        </FormField>

        <CheckboxRow>
            <input
              type="checkbox"
              checked={deleteAfter}
            onChange={(event) => setDeleteAfter(event.target.checked)}
          />
          <span>Удалить файл с сервера после обработки (рекомендуется)</span>
        </CheckboxRow>
      </div>

      {!isUpdate ? (
        <TrustPanel
          className="mt-4"
          title="Что включится"
          items={trustPanelItemsForPath('file_import')}
        />
      ) : null}

      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

      <FormActions className="mt-4">
        <Button className="flex-1" type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Загрузка...' : isUpdate ? 'Обновить отчёт' : 'Загрузить и продолжить'}
        </Button>
        {!isOnboarding ? (
          <Link to="/settings/connections">
            <Button variant="ghost" type="button">
              Отмена
            </Button>
          </Link>
        ) : null}
      </FormActions>
    </>
  );

  if (isOnboarding) {
    return (
      <AuthSplitLayout
        topbar="back"
        showBrandBlock={false}
        brandTitle="Без API-ключа"
        brandDescription="Файл остаётся у вас: мы парсим отчёт и строим дашборды. Ключ не нужен."
        backTo="/onboarding/connect"
        backLabel="Назад"
        panelTitle="Загрузить отчёт"
        panelDescription="Wildberries · продажи и заказы"
      >
        {content}
      </AuthSplitLayout>
    );
  }

  return content;
}

export function OnboardingUploadCsvPage() {
  return <UploadCsvForm variant="onboarding" />;
}

export function ConnectionsUploadCsvPage() {
  const location = useLocation();
  const state = (location.state as UploadCsvLocationState | null) ?? {};

  return (
    <DocPage
      title={state.connectionId ? 'Обновить отчёт' : 'Загрузить отчёт'}
      lead={
        state.connectionId
          ? `${connectionProviderLabel(state.provider ?? 'wildberries')} · замена данных из нового CSV`
          : 'Wildberries · продажи и заказы · без API-ключа'
      }
      icon={FileSpreadsheet}
      back="auto"
      mobileTitle={state.connectionId ? 'Обновление CSV' : 'Загрузка CSV'}
    >
      <DocBlock>
        <UploadCsvForm
          variant="settings"
          connectionId={state.connectionId}
          initialProvider={state.provider}
          initialReportType={state.reportType}
        />
      </DocBlock>
    </DocPage>
  );
}
