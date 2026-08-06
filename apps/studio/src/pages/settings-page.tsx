import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { OrgLogo, UserAvatar } from '@/components/user-avatar';
import { ThemeSegmented } from '@/components/doc/theme-segmented';
import { Button } from '@/components/ui/button';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { usePrivacySettings } from '@/hooks/use-privacy';
import { signOut } from '@/lib/auth-client';
import { privacyBenchmarkHint } from '@/lib/workspace-status';

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

export function SettingsPage() {
  const { data: me } = useMe();
  const canManage = useCanWriteDashboards();
  const { data: privacy } = usePrivacySettings();
  const orgName = me?.organization?.name ?? 'Компания';
  const userName = me?.user?.name ?? 'Профиль';
  const userEmail = me?.user?.email ?? '';

  return (
    <DocPage
      title="Настройки"
      lead={canManage ? 'Аккаунт, данные и оплата' : 'Профиль и доступы'}
      icon={Settings}
      mobileSubtitle={orgName}
      back="auto"
    >
      <DocBlock title="Профиль">
        <SettingsGroup>
          <SettingsRow actionTo="/settings/profile" actionLabel="Изменить" label="">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={me?.user?.name}
                email={me?.user?.email}
                image={me?.user?.image}
                cacheKey={me?.user?.id}
                className="size-8 shrink-0 rounded-full text-sm"
              />
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
            hint="Смена через письмо на email"
            actionTo="/forgot-password"
            actionLabel="Сменить"
          />
        </SettingsGroup>
      </DocBlock>

      <DocBlock title="Компания">
        <SettingsGroup>
          {canManage ? (
            <SettingsRow actionTo="/settings/company" actionLabel="Изменить" label="">
              <div className="flex items-center gap-3">
                <OrgLogo
                  name={orgName}
                  logo={me?.organization?.logo}
                  cacheKey={me?.organization?.id}
                  className="size-8 shrink-0 rounded-md text-sm"
                />
                <div>
                  <div className="settings-row__label">{orgName}</div>
                  <div className="settings-row__hint">Название и реквизиты</div>
                </div>
              </div>
            </SettingsRow>
          ) : (
            <SettingsRow label={orgName} hint="Ваша компания" />
          )}
          <SettingsRow label="Команда" hint="Приглашения и роли" actionTo="/team" actionLabel="Открыть" />
        </SettingsGroup>
      </DocBlock>

      {canManage ? (
        <DocBlock title="Данные и аналитика">
          <SettingsGroup>
            <SettingsRow
              label="Источники данных"
              hint="Маркетплейс, файл или база"
              actionTo="/settings/connections"
              actionLabel="Настроить"
            />
            <SettingsRow
              label="Данные и бенчмарки"
              hint={privacyBenchmarkHint(privacy)}
              actionTo="/settings/privacy"
              actionLabel="Настроить"
            />
            <SettingsRow
              label="AI-инсайты"
              hint="Расписание и метрики"
              actionTo="/insights/settings"
              actionLabel="Настроить"
            />
            <SettingsRow
              label="Семантика"
              hint="Кубы, меры и измерения"
              actionTo="/semantic"
              actionLabel="Открыть"
            />
          </SettingsGroup>
        </DocBlock>
      ) : (
        <DocBlock title="Данные">
          <SettingsGroup>
            <SettingsRow
              label="Конфиденциальность"
              hint="Как используются данные"
              actionTo="/settings/privacy"
              actionLabel="Открыть"
            />
            <SettingsRow
              label="Безопасность"
              hint="Шифрование и доступ"
              actionTo="/settings/security"
              actionLabel="Открыть"
            />
          </SettingsGroup>
        </DocBlock>
      )}

      {canManage ? (
        <DocBlock title="Оплата">
          <SettingsGroup>
            <SettingsRow
              label="Тариф и кредиты"
              hint="Подписка и AI-кредиты"
              actionTo="/settings/billing"
              actionLabel="Открыть"
            />
            <SettingsRow
              label="Безопасность"
              hint="Ключи API и файлы"
              actionTo="/settings/security"
              actionLabel="Открыть"
            />
          </SettingsGroup>
        </DocBlock>
      ) : null}

      <DocBlock title="Оформление">
        <SettingsGroup>
          <SettingsRow
            label="Тема"
            hint="Светлая или тёмная"
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
