import { useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { Button } from '@/components/ui/button';
import { BRAND_APP_HOST_HINT } from '@/lib/brand';
import { Input } from '@/components/ui/input';
import { useMe, meQueryKey } from '@/hooks/use-me';
import { authClient } from '@/lib/auth-client';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function SettingsCompanyPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [name, setName] = useState('');
  const [marketplace, setMarketplace] = useState('Wildberries');
  const [category, setCategory] = useState('Дом и текстиль');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const orgId = me?.organization?.id;
  const orgName = me?.organization?.name ?? '';

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
      setStatus('Компания сохранена');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const orgInitial = orgName.charAt(0).toUpperCase();

  return (
    <DocPage
      title="Компания"
      lead="Название и логотип — в sidebar, embed и счетах"
      icon={Building2}
      back="auto"
    >
      <DocBlock title="Логотип">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-md bg-primary/10 text-lg font-bold text-primary">
            {orgInitial}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" type="button" disabled>
                Загрузить
              </Button>
              <Button variant="ghost" size="sm" type="button" disabled>
                Удалить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Квадрат PNG/SVG, до 1 МБ. Скоро.</p>
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
        {status ? <p className="mb-3 text-xs text-muted-foreground">{status}</p> : null}
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
