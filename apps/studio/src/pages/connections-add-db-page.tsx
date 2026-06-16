import { Database, PlugZap } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { CheckboxRow } from '@/components/doc/checkbox-row';
import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateDatabaseConnection, useTestDatabaseConnection } from '@/hooks/use-connections';

export function ConnectionsAddDbPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const testConnection = useTestDatabaseConnection();
  const createConnection = useCreateDatabaseConnection();
  const fromOnboarding = (location.state as { from?: string } | null)?.from === 'onboarding';

  const [name, setName] = useState('Production Postgres');
  const [provider, setProvider] = useState<'postgresql' | 'mysql' | 'bigquery' | 'clickhouse'>('postgresql');
  const [host, setHost] = useState('db.acme.internal');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('analytics');
  const [user, setUser] = useState('umetrica_ro');
  const [password, setPassword] = useState('');
  const [ssl, setSsl] = useState(true);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = fromOnboarding
    ? { to: '/onboarding/connect', label: 'Онбординг' }
    : ('auto' as const);

  const payload = {
    provider,
    name: name.trim(),
    host: host.trim(),
    port: Number(port),
    database: database.trim(),
    user: user.trim(),
    password,
    ssl,
  };

  const handleTest = async () => {
    setError(null);
    setTestMessage(null);
    setTestOk(false);
    try {
      const result = await testConnection.mutateAsync(payload);
      setTestOk(result.ok);
      setTestMessage(result.message);
    } catch (err) {
      setTestOk(false);
      setTestMessage(err instanceof Error ? err.message : 'Ошибка проверки');
    }
  };

  const handleSave = async () => {
    setError(null);
    try {
      await createConnection.mutateAsync(payload);
      navigate(fromOnboarding ? '/' : '/settings/connections');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  return (
    <DocPage
      title="Подключить базу данных"
      lead="Cube.js будет читать данные только для запросов вашей компании"
      icon={Database}
      back={back}
      mobileTitle="Источник данных"
      mobileSubtitle="Новое подключение"
      actions={
        <Link to="/settings/connections">
          <Button variant="ghost" size="sm" type="button">
            Отмена
          </Button>
        </Link>
      }
    >
      <DocBlock title="Параметры">
        <div className="max-w-xl space-y-4">
          <FormField label="Название">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label="Тип">
            <select
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value as 'postgresql' | 'mysql' | 'bigquery' | 'clickhouse')
              }
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="bigquery">BigQuery</option>
              <option value="clickhouse">ClickHouse</option>
            </select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Хост">
              <Input value={host} onChange={(event) => setHost(event.target.value)} />
            </FormField>
            <FormField label="Порт">
              <Input value={port} onChange={(event) => setPort(event.target.value)} />
            </FormField>
          </div>
          <FormField label="База данных">
            <Input value={database} onChange={(event) => setDatabase(event.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Пользователь">
              <Input value={user} onChange={(event) => setUser(event.target.value)} />
            </FormField>
            <FormField label="Пароль">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </FormField>
          </div>
          <CheckboxRow>
            <input
              type="checkbox"
              checked={ssl}
              onChange={(event) => setSsl(event.target.checked)}
            />
            <span>SSL (рекомендуется для production)</span>
          </CheckboxRow>
        </div>
      </DocBlock>

      <DocBlock title="Проверка">
        <SettingsGroup>
          <SettingsRow
            label="Тестовое подключение"
            hint="Проверим доступ и наличие схемы public"
            action={
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleTest}
                disabled={testConnection.isPending || provider !== 'postgresql'}
              >
                <PlugZap className="size-3.5" />
                {testConnection.isPending ? 'Проверка...' : 'Проверить'}
              </Button>
            }
          />
        </SettingsGroup>
        {provider !== 'postgresql' ? (
          <DocCallout className="mt-3">Тест подключения пока доступен только для PostgreSQL.</DocCallout>
        ) : null}
        {testMessage ? (
          <DocCallout className={`mt-3 ${testOk ? '' : 'border-destructive/40'}`}>{testMessage}</DocCallout>
        ) : null}
      </DocBlock>

      <DocBlock>
        {error ? <p className="mb-3 text-xs text-destructive">{error}</p> : null}
        <FormActions>
          <Button
            type="button"
            onClick={handleSave}
            disabled={createConnection.isPending || !password.trim()}
          >
            {createConnection.isPending ? 'Сохранение...' : 'Сохранить и подключить'}
          </Button>
          <Link to="/settings/connections">
            <Button variant="ghost" type="button">
              Отмена
            </Button>
          </Link>
        </FormActions>
      </DocBlock>
    </DocPage>
  );
}
