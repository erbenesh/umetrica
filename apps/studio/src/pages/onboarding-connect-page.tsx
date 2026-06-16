import { Database, FileUp, Globe, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { OnboardingPathCard } from '@/components/onboarding/onboarding-path-card';
import { Button } from '@/components/ui/button';
import { CONTRIBUTION_PATH_COPY } from '@/lib/trust-policy-ui';
import { useMe } from '@/hooks/use-me';

const ONBOARDING_FROM = { from: 'onboarding' };

export function OnboardingConnectPage() {
  const { data: me } = useMe();
  const orgName = me?.organization?.name ?? 'Ваша компания';

  return (
    <AuthSplitLayout
      topbar="mark"
      showBrandBlock={false}
      brandTitle="Шаг 2 из 2"
      brandDescription="Подключайте данные постепенно: сначала рынок без кабинета, потом файл или API — когда будете готовы."
      brandStats={[
        { value: '0', label: 'обязательных ключей' },
        { value: '152-ФЗ', label: 'данные в РФ' },
      ]}
      panelTitle="Как подключить данные?"
      panelDescription={`${orgName} · выберите уровень доступа`}
      footer={
        <>
          Бенчмарки — отдельное согласие, только обезличенные сводки ·{' '}
          <Link to="/settings/privacy" className="text-primary hover:underline">
            Как это устроено
          </Link>
        </>
      }
    >
      <nav className="onboarding-paths" aria-label="Способы подключения данных">
        <OnboardingPathCard
          to="/insights"
          icon={Globe}
          title="Только рынок"
          hint={CONTRIBUTION_PATH_COPY.market_only.hint}
          recommended
        />
        <OnboardingPathCard
          to="/onboarding/upload-csv"
          icon={FileUp}
          title="Файл CSV или Excel"
          hint={CONTRIBUTION_PATH_COPY.file_import.hint}
        />
        <OnboardingPathCard
          to="/settings/connections/add-marketplace"
          icon={KeyRound}
          title="API маркетплейса"
          hint={CONTRIBUTION_PATH_COPY.marketplace_api.hint}
          state={ONBOARDING_FROM}
        />
        <OnboardingPathCard
          to="/settings/connections/add-db"
          icon={Database}
          title="Своя база данных"
          hint={CONTRIBUTION_PATH_COPY.database.hint}
          state={ONBOARDING_FROM}
        />
      </nav>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Не готовы делиться сейчас — начните с рынка или демо. Ключи и файлы подключите позже в{' '}
        <Link to="/settings/connections" className="text-primary hover:underline">
          подключениях
        </Link>
        .
      </p>

      <div className="form-actions">
        <Link to="/">
          <Button variant="ghost" className="h-11 w-full text-base" type="button">
            Пропустить · демо-данные
          </Button>
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
