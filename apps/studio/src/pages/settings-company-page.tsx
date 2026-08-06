import { useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { OrgLogo } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { BRAND_APP_HOST_HINT } from '@/lib/brand';
import { Input } from '@/components/ui/input';
import { useMe, meQueryKey } from '@/hooks/use-me';
import { organizationsQueryKey } from '@/hooks/use-organizations';
import { appToast } from '@/lib/app-toast';
import { getErrorMessage } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { deleteOrgLogo, uploadOrgLogo } from '@/lib/profile-api';

const ACCEPTED_LOGO_TYPES = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function SettingsCompanyPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: me } = useMe();
  const [name, setName] = useState('');
  const [marketplace, setMarketplace] = useState('Wildberries');
  const [category, setCategory] = useState('Дом и текстиль');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoCacheKey, setLogoCacheKey] = useState<string | null>(null);

  const orgId = me?.organization?.id;
  const orgName = me?.organization?.name ?? '';
  const hasLogo = Boolean(me?.organization?.logo);

  useEffect(() => {
    setName(orgName);
  }, [orgName]);

  const handleSave = async () => {
    if (!orgId) return;
    setStatus(null);
    setSaving(true);
    try {
      const result = await authClient.organization.update({
        organizationId: orgId,
        data: { name: name.trim() },
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      appToast.success('Компания сохранена');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить';
      setStatus(message);
      appToast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setLogoBusy(true);
    try {
      const result = await uploadOrgLogo(file);
      setLogoCacheKey(result.updatedAt);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meQueryKey }),
        queryClient.invalidateQueries({ queryKey: organizationsQueryKey }),
      ]);
      appToast.success('Логотип обновлён');
    } catch (err) {
      appToast.error(getErrorMessage(err, 'Не удалось загрузить логотип'));
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!hasLogo) return;

    setLogoBusy(true);
    try {
      await deleteOrgLogo();
      setLogoCacheKey(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meQueryKey }),
        queryClient.invalidateQueries({ queryKey: organizationsQueryKey }),
      ]);
      appToast.success('Логотип удалён');
    } catch (err) {
      appToast.error(getErrorMessage(err, 'Не удалось удалить логотип'));
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <DocPage
      title="Компания"
      lead="Название и логотип — в sidebar, embed и счетах"
      icon={Building2}
      back="auto"
    >
      <DocBlock title="Логотип">
        <div className="flex flex-wrap items-start gap-4">
          <OrgLogo
            name={orgName}
            logo={me?.organization?.logo}
            cacheKey={logoCacheKey ?? orgId}
            className="size-12 rounded-md"
          />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={logoBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {logoBusy ? 'Загрузка...' : 'Загрузить'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={logoBusy || !hasLogo}
                onClick={handleLogoDelete}
              >
                Удалить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG или WebP, до 1 МБ.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_LOGO_TYPES}
              className="sr-only"
              onChange={handleLogoSelect}
            />
          </div>
        </div>
      </DocBlock>

      <DocBlock title="Реквизиты">
        <div className="max-w-xl space-y-4">
          <FormField label="Название">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label="Slug" hint={`${BRAND_APP_HOST_HINT}/o/${slugify(name || 'company')} · меняется редко`}>
            <Input value={slugify(name || orgName || 'company')} readOnly />
          </FormField>
          <FormField label="Маркетплейс">
            <select
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={marketplace}
              onChange={(event) => setMarketplace(event.target.value)}
            >
              <option>Wildberries</option>
              <option>Ozon</option>
              <option>Несколько</option>
            </select>
          </FormField>
          <FormField label="Категория (рыночные инсайты)">
            <select
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>Дом и текстиль</option>
              <option>Одежда</option>
            </select>
          </FormField>
          <FormField label="Сайт">
            <Input
              type="url"
              placeholder="https://example.ru"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </FormField>
        </div>
      </DocBlock>

      <DocBlock title="Enterprise">
        <SettingsGroup>
          <SettingsRow
            label="Audit log"
            hint="История действий в компании"
            actionTo="/settings/audit"
            actionLabel="Открыть"
          />
          <SettingsRow
            label="SSO / SAML"
            hint="Вход через IdP"
            actionTo="/settings/sso"
            actionLabel="Настроить"
          />
          <SettingsRow
            label="Свой LLM (BYOK)"
            hint="Ключ провайдера вместо квоты платформы"
            actionTo="/settings/enterprise/llm"
            actionLabel="Настроить"
          />
        </SettingsGroup>
      </DocBlock>

      <DocBlock>
        {status ? <p className="mb-3 text-xs text-destructive">{status}</p> : null}
        <FormActions>
          <Button type="button" onClick={handleSave} disabled={saving || !orgId || name.trim() === orgName}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Link to="/settings">
            <Button variant="ghost" type="button">
              Отмена
            </Button>
          </Link>
        </FormActions>
      </DocBlock>
    </DocPage>
  );
}
