import { EyeOff, Lock, MapPin, RotateCcw, ScrollText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { SettingsGroup, SettingsRow } from '@/components/doc/settings-row';
import { TrustList } from '@/components/doc/trust-list';
import { Button } from '@/components/ui/button';
import { BRAND_NAME_RU } from '@/lib/brand';

export function SettingsSecurityPage() {
  return (
    <DocPage
      title="Безопасность данных"
      lead="Как мы храним API-ключи и обрабатываем отчёты селлеров"
      icon={ShieldCheck}
      back="auto"
      mobileTitle="Безопасность"
    >
      <DocBlock title="API-ключи маркетплейсов">
        <TrustList
          items={[
            { icon: Lock, text: 'Шифрование at rest (AES-256) · доступ только сервису аналитики' },
            { icon: MapPin, text: 'Серверы в РФ · соответствие 152-ФЗ' },
            { icon: EyeOff, text: 'Минимальные scope: только статистика, без write-методов' },
            { icon: RotateCcw, text: `Отзыв ключа в ${BRAND_NAME_RU} = немедленная остановка синхронизации` },
            {
              icon: ScrollText,
              text: (
                <>
                  Все обращения к API пишутся в{' '}
                  <Link to="/settings/audit" className="text-primary hover:underline">
                    audit log
                  </Link>{' '}
                  (Enterprise)
                </>
              ),
            },
          ]}
        />
      </DocBlock>

      <DocBlock title="Как создать ключ WB с минимальными правами">
        <ol className="m-0 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-muted-foreground">
          <li>Кабинет продавца → Настройки → Доступ к API</li>
          <li>Создайте ключ «Только статистика» / read-only</li>
          <li>Не включайте контент, цены, рекламу и финансы</li>
          <li>
            Вставьте ключ в{' '}
            <Link to="/settings/connections/add-marketplace" className="text-primary hover:underline">
              подключении
            </Link>
          </li>
        </ol>
      </DocBlock>

      <DocBlock title="Загруженные файлы">
        <p className="mb-3 text-[13px] text-muted-foreground">
          CSV/XLSX обрабатываются в изолированном контуре и по умолчанию удаляются после импорта.
        </p>
        <Link to="/settings/connections/upload-csv">
          <Button variant="outline" size="sm" type="button">
            Загрузить отчёт
          </Button>
        </Link>
      </DocBlock>

      <DocBlock title="Документы">
        <SettingsGroup>
          <SettingsRow
            label="Политика конфиденциальности"
            hint="152-ФЗ · обработка ПДн"
            actionLabel="PDF"
            onAction={() => undefined}
          />
          <SettingsRow
            label="Договор оферты"
            hint="B2B · юрлица РФ"
            actionLabel="PDF"
            onAction={() => undefined}
          />
        </SettingsGroup>
      </DocBlock>
    </DocPage>
  );
}
