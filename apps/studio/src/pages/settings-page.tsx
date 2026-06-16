import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { ThemeSegmented } from '@/components/doc/theme-segmented';
import { OrgSwitcher } from '@/components/layout/org-switcher';
import { Button } from '@/components/ui/button';
import { useMe } from '@/hooks/use-me';
import { signOut } from '@/lib/auth-client';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  viewer: 'Наблюдатель',
  member: 'Участник',
};

function roleLabel(role?: string) {
  if (!role) return 'Участник';
  return ROLE_LABELS[role] ?? role;
}

function userInitial(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || '?';
  return source.charAt(0).toUpperCase();
}

export function SettingsPage() {
  const { data: me } = useMe();
  const orgName = me?.organization?.name ?? 'Компания';
  const userName = me?.user?.name ?? 'Профиль';
  const userEmail = me?.user?.email ?? '';

  return (
    <DocPage
      title="Настройки"
      lead="Профиль, данные, конфиденциальность и биллинг"
      icon={Settings}
      mobileSubtitle={orgName}
    >
      <DocBlock title="Профиль">
        <SettingsGroup>
          <SettingsRow
            actionTo="/settings/profile"
            actionLabel="Изменить"
            label=""
          >
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {userInitial(me?.user?.name, me?.user?.email)}
              </span>
              <div>
                <div className="settings-row__label">{userName}</div>
                <div className="settings-row__hint">
                  {userEmail}
                  {me?.role ? ` · ${roleLabel(me.role)}` : ''}
                </div>
              </div>
            </div>
          </SettingsRow>
          <SettingsRow
            label="Пароль"
            hint="Смена пароля через email"
            actionTo="/forgot-password"
            actionLabel="Сменить"
          />
        </SettingsGroup>
      </DocBlock>

      <DocBlock title="Компания">
        <SettingsGroup>
          <SettingsRow actionTo="/settings/company" actionLabel="Изменить" label="">
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                {orgName.charAt(0).toUpperCase()}
              </span>
              <div>
                <div className="settings-row__label">{orgName}</div>
                <div className="settings-row__hint">Участники и роли</div>
              </div>
            </div>
          </SettingsRow>
          <SettingsRow
            label="Команда"
            hint="Участники и роли"
            actionTo="/team"
            actionLabel="Открыть"
          />
          <SettingsRow label="Workspace" hint="Переключение между компаниями">
            <div className="w-full max-w-xs">
              <OrgSwitcher />
            </div>
          </SettingsRow>
        </SettingsGroup>
      </DocBlock>

      <DocBlock title="AI-инсайты">
        <SettingsGroup>
          <SettingsRow
            label="Расписание и метрики"
            hint="Автопроверки · owner/admin"
            actionTo="/insights/settings"
            actionLabel="Настроить"
          />
        </SettingsGroup>
      </DocBlock>

      <DocBlock title="Биллинг">
        <SettingsGroup>
          <SettingsRow
            label="Подписка и оплата"
            hint="Тарифы и способы оплаты"
            actionTo="/settings/billing"
            actionLabel="Открыть"
          />
        </SettingsGroup>
      </DocBlock>

      <DocBlock title="Конфиденциальность">
        <SettingsGroup>
          <SettingsRow
            label="Бенчмарки и рынок"
            hint="Согласие на обезличенные сравнения · выкл."
            actionTo="/settings/privacy"
            actionLabel="Настроить"
          />
          <SettingsRow
            label="Безопасность API и файлов"
            hint="152-ФЗ · шифрование ключей"
            actionTo="/settings/security"
            actionLabel="Открыть"
          />
        </SettingsGroup>
      </DocBlock>

      <DocBlock title="Данные">
        <SettingsGroup>
          <SettingsRow
            label="Маркетплейсы и источники"
            hint="WB CSV · API · PostgreSQL"
            actionTo="/settings/connections"
            actionLabel="Настроить"
          />
        </SettingsGroup>
      </DocBlock>

      <DocBlock title="Оформление">
        <SettingsGroup>
          <SettingsRow
            label="Тема интерфейса"
            hint="Светлая или тёмная — применяется ко всему приложению"
            action={<ThemeSegmented />}
          />
        </SettingsGroup>
      </DocBlock>

      <DocBlock>
        <Button variant="outline" className="w-full md:w-auto" onClick={() => signOut()}>
          Выйти из аккаунта
        </Button>
      </DocBlock>
    </DocPage>
  );
}
