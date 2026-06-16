import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';

export function NotFoundPage() {
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);

  return (
    <DocPage
      title="Страница не найдена"
      lead="Такого адреса нет в приложении — возможно, ссылка устарела или опечатка в URL."
      icon={Compass}
      mobileTitle="404"
      headless={!isAuthenticated}
    >
      <DocBlock>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/">
            <Button type="button">На главную</Button>
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/insights">
                <Button variant="outline" type="button">
                  AI-инсайты
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" type="button">
                  Настройки
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="outline" type="button">
                Войти
              </Button>
            </Link>
          )}
        </div>
      </DocBlock>
    </DocPage>
  );
}
