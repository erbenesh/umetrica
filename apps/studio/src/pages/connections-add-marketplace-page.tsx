import { Check, FileUp, Store, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { CheckboxRow } from '@/components/doc/checkbox-row';
import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { TrustPanel } from '@/components/doc/trust-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateMarketplaceConnection, useTestMarketplaceConnection } from '@/hooks/use-connections';

const PROVIDER_CONFIG = {
  wildberries: {
    title: 'Подключить Wildberries',
    apiLabel: 'API-ключ Wildberries',
    apiPlaceholder: 'Вставьте ключ из кабинета продавца',
    securityHint: 'Как создать ключ с минимальными правами →',
  },
  ozon: {
    title: 'Подключить Ozon',
    apiLabel: 'Api-Key Ozon',
    apiPlaceholder: 'UUID ключа из Настройки → Seller API',
    securityHint: 'Как получить Client-Id и Api-Key →',
  },
} as const;

type MarketplaceProvider = keyof typeof PROVIDER_CONFIG;

function resolveProvider(value: string | null): MarketplaceProvider {
  return value === 'ozon' ? 'ozon' : 'wildberries';
}

export function ConnectionsAddMarketplacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const provider = resolveProvider(searchParams.get('provider'));
  const config = PROVIDER_CONFIG[provider];

  const testConnection = useTestMarketplaceConnection();
  const createConnection = useCreateMarketplaceConnection();
  const fromOnboarding = (location.state as { from?: string } | null)?.from === 'onboarding';

  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [category, setCategory] = useState('Дом и текстиль');
  const [benchmark, setBenchmark] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = fromOnboarding
    ? { to: '/onboarding/connect', label: 'Онбординг' }
    : ('auto' as const);

  const canSubmit =
    apiKey.trim().length > 0 && (provider !== 'ozon' || clientId.trim().length > 0);

  const handleTest = async () => {
    setError(null);
    setTestMessage(null);
    setTestOk(false);

    try {
      const result = await testConnection.mutateAsync({
        provider,
        apiKey: apiKey.trim(),
        ...(provider === 'ozon' ? { clientId: clientId.trim() } : {}),
      });
      setTestOk(result.ok);
      setTestMessage(result.message);
    } catch (err) {
      setTestOk(false);
      setTestMessage(err instanceof Error ? err.message : 'Ошибка проверки');
    }
  };

  const handleConnect = async () => {
    setError(null);
    try {
      const result = await createConnection.mutateAsync({
        provider,
        apiKey: apiKey.trim(),
        ...(provider === 'ozon' ? { clientId: clientId.trim() } : {}),
        category,
        benchmarkOptIn: benchmark,
      });
      navigate(fromOnboarding ? '/' : '/settings/connections', {
        state: { importFlash: result.sync.message },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подключить');
    }
  };

  return (
    <DocPage
      title={config.title}
      lead="Только чтение статистики · ключ можно отозвать в любой момент"
      icon={Store}
      back={back}
      mobileTitle="API маркетплейса"
    >
      <DocBlock>
        <div className="mb-4 flex flex-wrap gap-2 text-[13px]">
          <Link
            to="?provider=wildberries"
            className={provider === 'wildberries' ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}
          >
            Wildberries
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            to="?provider=ozon"
            className={provider === 'ozon' ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}
          >
            Ozon
          </Link>
        </div>
        <TrustPanel
          title="Мы запрашиваем только это"
          items={[
            { icon: Check, text: 'Статистика продаж и заказов (read-only)' },
            { icon: Check, text: 'Шифрование AES-256 · хранение в РФ' },
            { icon: X, text: 'Без изменения цен, карточек и рекламы' },
            { icon: X, text: 'Без передачи сырых данных другим селлерам' },
          ]}
        />
      </DocBlock>

      <DocBlock title="Ключ API">
        <div className="max-w-xl space-y-4">
          {provider === 'ozon' ? (
            <FormField
              label="Client-Id Ozon"
              hint="Числовой идентификатор из Настройки → Seller API → API-ключи"
            >
              <Input
                placeholder="Например, 123456"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              />
            </FormField>
          ) : null}

          <FormField
            label={config.apiLabel}
            hint={
              <Link to="/settings/security" className="text-primary hover:underline">
                {config.securityHint}
              </Link>
            }
          >
            <Input
              type="password"
              placeholder={config.apiPlaceholder}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </FormField>

          <FormField label="Категория для рыночных инсайтов">
            <select
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>Дом и текстиль</option>
              <option>Одежда</option>
              <option>Красота</option>
            </select>
          </FormField>

          <CheckboxRow>
            <input
              type="checkbox"
              checked={benchmark}
              onChange={(event) => setBenchmark(event.target.checked)}
            />
            <span>
              Участвовать в бенчмарк-пуле (получать и делиться) ·{' '}
              <Link to="/settings/privacy" className="text-primary hover:underline">
                подробнее
              </Link>
            </span>
          </CheckboxRow>
        </div>
      </DocBlock>

      <DocBlock>
        {testMessage ? (
          <DocCallout className={`mb-3 ${testOk ? '' : 'border-destructive/40'}`}>{testMessage}</DocCallout>
        ) : null}
        {error ? <p className="mb-3 text-xs text-destructive">{error}</p> : null}
        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testConnection.isPending || !canSubmit}
          >
            {testConnection.isPending ? 'Проверка...' : 'Проверить ключ'}
          </Button>
          <Button type="button" onClick={handleConnect} disabled={createConnection.isPending || !canSubmit}>
            {createConnection.isPending ? 'Подключение...' : 'Подключить'}
          </Button>
          <Link to={fromOnboarding ? '/onboarding/upload-csv' : '/settings/connections/upload-csv'}>
            <Button variant="ghost" type="button">
              <FileUp className="size-3.5" />
              Вместо этого загрузить CSV
            </Button>
          </Link>
        </FormActions>
      </DocBlock>
    </DocPage>
  );
}
