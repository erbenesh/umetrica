import type { EnterpriseLlmProvider } from '@sellerpool/core';

import { Loader2, Shield } from 'lucide-react';

import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';



import { CheckboxRow } from '@/components/doc/checkbox-row';

import { DocBlock } from '@/components/doc/doc-block';

import { DocCallout } from '@/components/doc/doc-callout';

import { DocPage } from '@/components/doc/doc-page';

import { FormActions, FormField } from '@/components/doc/form-field';

import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';

import { Input } from '@/components/ui/input';

import { useEnterpriseLlmSettings, useUpdateEnterpriseLlmSettings } from '@/hooks/use-enterprise';

import { useBilling } from '@/hooks/use-billing';

import { useCanWriteDashboards } from '@/hooks/use-me';
import { BRAND_NAME_RU } from '@/lib/brand';



export function SettingsEnterpriseLlmPage() {

  const canWrite = useCanWriteDashboards();

  const { data: billing } = useBilling();

  const { data, isLoading, error } = useEnterpriseLlmSettings();

  const update = useUpdateEnterpriseLlmSettings();



  const [enabled, setEnabled] = useState(false);

  const [provider, setProvider] = useState<EnterpriseLlmProvider>('deepseek');

  const [apiKey, setApiKey] = useState('');

  const [baseUrl, setBaseUrl] = useState('');

  const [saveError, setSaveError] = useState<string | null>(null);



  const isEnterprise = billing?.planId === 'enterprise';

  const formDisabled = !canWrite || !isEnterprise;



  useEffect(() => {

    if (!data) return;

    setEnabled(data.enabled);

    setProvider(data.provider);

    setBaseUrl(data.baseUrl ?? '');

    setApiKey('');

  }, [data]);



  const handleSave = async () => {

    setSaveError(null);



    try {

      await update.mutateAsync({

        enabled,

        provider,

        baseUrl: baseUrl || undefined,

        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),

      });

      setApiKey('');

    } catch (err) {

      setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить');

    }

  };



  return (

    <DocPage

      title="Свой LLM-провайдер"

      lead={`Опция для Enterprise: запросы к LLM идут через ваш ключ, а не через квоту ${BRAND_NAME_RU}`}

      icon={Shield}

      back={{ to: '/settings/billing', label: 'Биллинг' }}

      mobileTitle="Свой LLM"

      mobileSubtitle="Enterprise"

    >

      {!isEnterprise && billing ? (

        <Card className="mb-4">

          <CardContent className="p-3 text-[13px] text-muted-foreground">

            BYOK LLM доступен на тарифе Enterprise.{' '}

            <Link to="/settings/billing/plans" className="text-primary hover:underline">

              Связаться о переходе →

            </Link>

          </CardContent>

        </Card>

      ) : null}



      {isEnterprise ? (

        <>

          <DocCallout variant="info">

            После включения BYOK кредиты AI-инсайтов платформы не используются. Оплата LLM — напрямую

            провайдеру. Тариф ${BRAND_NAME_RU} остаётся без скидки.

          </DocCallout>



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



          {data ? (

            <>

              <DocBlock title="Провайдер">

                <div className="max-w-lg space-y-4">

                  <CheckboxRow>

                    <input

                      type="checkbox"

                      checked={enabled}

                      disabled={formDisabled}

                      onChange={(event) => setEnabled(event.target.checked)}

                    />

                    <span>Использовать свой LLM вместо платформенного</span>

                  </CheckboxRow>



                  <FormField label="Провайдер">

                    <select

                      className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"

                      value={provider}

                      disabled={formDisabled}

                      onChange={(event) =>

                        setProvider(event.target.value as EnterpriseLlmProvider)

                      }

                    >

                      <option value="deepseek">DeepSeek</option>

                      <option value="qwen">Qwen (DashScope)</option>

                    </select>

                  </FormField>



                  <FormField

                    label="API-ключ"

                    hint={

                      data.hasApiKey && !apiKey

                        ? `Текущий: ${data.apiKeyMask}. Введите новый ключ, чтобы заменить.`

                        : 'Хранится зашифрованно. В интерфейсе показывается только маска.'

                    }

                  >

                    <Input

                      type="password"

                      placeholder={data.hasApiKey ? '••••••••' : 'sk-...'}

                      autoComplete="off"

                      value={apiKey}

                      disabled={formDisabled}

                      onChange={(event) => setApiKey(event.target.value)}

                    />

                  </FormField>



                  <FormField label="Base URL" hint="Необязательно">

                    <Input

                      type="url"

                      placeholder={

                        provider === 'qwen'

                          ? 'https://dashscope.aliyuncs.com'

                          : 'https://api.deepseek.com'

                      }

                      value={baseUrl}

                      disabled={formDisabled}

                      onChange={(event) => setBaseUrl(event.target.value)}

                    />

                  </FormField>

                </div>

              </DocBlock>



              {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}



              <DocBlock>

                <FormActions>

                  <Button

                    type="button"

                    disabled={formDisabled || update.isPending}

                    onClick={() => void handleSave()}

                  >

                    {update.isPending ? 'Сохранение...' : 'Сохранить'}

                  </Button>

                  <Link to="/settings/billing">

                    <Button variant="ghost" type="button">

                      Отмена

                    </Button>

                  </Link>

                </FormActions>

              </DocBlock>

            </>

          ) : null}

        </>

      ) : null}

    </DocPage>

  );

}


