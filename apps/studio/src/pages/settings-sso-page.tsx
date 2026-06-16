import { KeyRound, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { CheckboxRow } from '@/components/doc/checkbox-row';
import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSsoSettings, useUpdateSsoSettings } from '@/hooks/use-enterprise';
import { useBilling } from '@/hooks/use-billing';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';

export function SettingsSsoPage() {
  const { data: me } = useMe();
  const canWrite = useCanWriteDashboards();
  const { data: billing } = useBilling();
  const { data, isLoading, error } = useSsoSettings();
  const update = useUpdateSsoSettings();

  const [enabled, setEnabled] = useState(false);
  const [requireForAll, setRequireForAll] = useState(false);
  const [idpSsoUrl, setIdpSsoUrl] = useState('');
  const [idpCertificate, setIdpCertificate] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEnterprise = billing?.planId === 'enterprise';

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setRequireForAll(data.requireForAll);
    setIdpSsoUrl(data.idpSsoUrl ?? '');
    setIdpCertificate(data.idpCertificate ?? '');
  }, [data]);

  const handleSave = async () => {
    setSaveError(null);

    try {
      await update.mutateAsync({
        enabled,
        requireForAll,
        idpSsoUrl: idpSsoUrl || undefined,
        idpCertificate: idpCertificate || undefined,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  return (
    <DocPage
      title="SSO / SAML"
      lead="Enterprise · вход через корпоративный IdP"
      icon={KeyRound}
      back={{ to: '/settings/company', label: 'Компания' }}
      mobileTitle="SSO"
      mobileSubtitle={me?.organization?.name}
    >
      {!isEnterprise && billing ? (
        <Card className="mb-4">
          <CardContent className="p-3 text-[13px] text-muted-foreground">
            SSO доступен на тарифе Enterprise.{' '}
            <Link to="/settings/billing/plans" className="text-primary hover:underline">
              Сменить тариф →
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {isEnterprise ? (
        <>
          {isLoading ? (
            <Card className="mb-4">
              <CardContent className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Загрузка...
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

          <DocBlock>
            <CheckboxRow>
              <input
                type="checkbox"
                checked={requireForAll}
                disabled={!canWrite}
                onChange={(event) => setRequireForAll(event.target.checked)}
              />
              <span>Требовать SSO для всех участников</span>
            </CheckboxRow>
          </DocBlock>

          <DocBlock title="SAML 2.0">
            <div className="form-fields max-w-lg">
              <CheckboxRow className="pb-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={!canWrite}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
                <span>Включить SSO</span>
              </CheckboxRow>
              <div className="field">
                <label htmlFor="idp-url">IdP SSO URL</label>
                <input
                  id="idp-url"
                  type="url"
                  className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                  placeholder="https://idp.company.com/saml/sso"
                  value={idpSsoUrl}
                  disabled={!canWrite}
                  onChange={(event) => setIdpSsoUrl(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="entity-id">Entity ID</label>
                <input
                  id="entity-id"
                  className="flex h-8 w-full rounded-md border border-input bg-muted px-2.5 text-[13px]"
                  value={data?.entityId ?? ''}
                  readOnly
                />
              </div>
              <div className="field">
                <label htmlFor="idp-cert">Сертификат IdP (PEM)</label>
                <textarea
                  id="idp-cert"
                  rows={4}
                  className="min-h-[88px] w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px]"
                  placeholder="-----BEGIN CERTIFICATE-----"
                  value={idpCertificate}
                  disabled={!canWrite}
                  onChange={(event) => setIdpCertificate(event.target.value)}
                />
              </div>
            </div>
          </DocBlock>

          <DocCallout>
            После включения парольный вход отключается для участников компании. Владелец
            сохраняет резервный доступ.
          </DocCallout>

          {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}

          <div className="form-actions max-w-lg">
            <Button type="button" disabled={!canWrite || update.isPending} onClick={() => void handleSave()}>
              {update.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button variant="ghost" type="button" disabled>
              Тестовый вход
            </Button>
          </div>
        </>
      ) : null}
    </DocPage>
  );
}
