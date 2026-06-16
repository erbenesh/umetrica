import { Database, FileUp, Globe, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { OnboardingPathCard } from '@/components/onboarding/onboarding-path-card';
import { Button } from '@/components/ui/button';
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
      brandDescription="Ключ кабинета не обязателен. Сначала — рыночные инсайты по вашей категории на WB, потом свои цифры."
      brandStats={[
        { value: '0', label: 'ключей на старте' },
        { value: '152-ФЗ', label: 'данные в РФ' },
      ]}
      panelTitle="Как подключить данные?"
      panelDescription={`${orgName} · текстиль на Wildberries`}
      footer={
        <>
          Участие в бенчмарках — отдельное согласие ·{' '}
          <Link to="/settings/privacy" className="text-primary hover:underline">
            Конфиденциальность
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        <OnboardingPathCard
          to="/insights"
          icon={Globe}
          title="Только рынок"
          hint="Сезонность, тренды категории, цены на витрине — без API и без вашего кабинета"
          recommended
        />
        <OnboardingPathCard
          to="/onboarding/upload-csv"
          icon={FileUp}
          title="Загрузить отчёт CSV"
          hint="Выгрузка из кабинета WB — дашборды и личные инсайты без API-ключа"
        />
        <OnboardingPathCard
          to="/settings/connections/add-marketplace"
          icon={KeyRound}
          title="API маркетплейса"
          hint={
            <>
              Автообновление · только чтение ·{' '}
              <Link to="/settings/security" className="text-primary hover:underline">
                как храним ключ
              </Link>
            </>
          }
          state={ONBOARDING_FROM}
        />
        <OnboardingPathCard
          to="/settings/connections/add-db"
          icon={Database}
          title="Своя база данных"
          hint="PostgreSQL и др. — для агентств и крупных селлеров с витриной"
          state={ONBOARDING_FROM}
        />
      </div>

      <div className="mt-4">
        <Link to="/">
          <Button variant="ghost" className="w-full" type="button">
            Пропустить · демо-данные
          </Button>
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
