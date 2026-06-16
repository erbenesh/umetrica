import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { Button } from '@/components/ui/button';

export function AccessDeniedPage() {
  return (
    <DocPage
      title="Нет доступа"
      lead="Этот раздел доступен только владельцу и администратору компании. Обратитесь к администратору, если нужны права."
      icon={ShieldOff}
      mobileTitle="Нет доступа"
      back="auto"
    >
      <DocBlock>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/">
            <Button type="button">На главную</Button>
          </Link>
          <Link to="/settings">
            <Button variant="outline" type="button">
              Настройки
            </Button>
          </Link>
          <Link to="/team">
            <Button variant="ghost" type="button">
              Команда
            </Button>
          </Link>
        </div>
      </DocBlock>
    </DocPage>
  );
}
