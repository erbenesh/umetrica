import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Button } from '@/components/ui/button';
import { useMe } from '@/hooks/use-me';
import { sendVerificationEmail } from '@/lib/auth-client';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me, refetch } = useMe();
  const [status, setStatus] = useState<string | null>(
    (location.state as { message?: string } | null)?.message ?? null
  );
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (message) setStatus(message);
  }, [location.state]);

  const handleResend = async () => {
    if (!me?.user.email) return;

    setIsSending(true);
    setStatus(null);

    try {
      const result = await sendVerificationEmail({
        email: me.user.email,
        callbackURL: `${window.location.origin}/`,
      });
      if (result.error) throw new Error(result.error.message);
      setStatus('Письмо отправлено. Проверьте почту или консоль API в dev-режиме.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Не удалось отправить письмо');
    } finally {
      setIsSending(false);
    }
  };

  if (me?.user.emailVerified) {
    return (
      <AuthSplitLayout
        topbar="mark"
        showBrandBlock={false}
        brandTitle="Доступ открыт"
        brandDescription="Email подтверждён — можно работать с дашбордами и инсайтами."
        panelTitle="Email подтверждён"
        panelDescription="Можно продолжать работу в umetrica"
      >
        <div className="form-actions form-actions--tight">
          <Button className="h-11 w-full text-base" onClick={() => navigate('/')} type="button">
            На главную
          </Button>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      topbar="mark"
      showBrandBlock={false}
      brandTitle="Почти готово"
      brandDescription="Подтверждение email защищает ваш аккаунт и компанию."
      panelTitle="Подтвердите email"
      panelDescription={
        <>
          Письмо отправлено на <strong>{me?.user.email ?? 'ваш адрес'}</strong>
        </>
      }
    >
      <p className="m-0 text-sm text-foreground-secondary">
        После подтверждения и входа компания создастся автоматически.
      </p>

      {status ? <p className="text-xs text-insight-info">{status}</p> : null}

      <div className="form-actions form-actions--tight">
        <Button className="h-11 w-full text-base" disabled={isSending} onClick={handleResend} type="button">
          {isSending ? 'Отправка...' : 'Отправить письмо снова'}
        </Button>
        <Button
          variant="secondary"
          className="h-11 w-full text-base"
          onClick={() => refetch()}
          type="button"
        >
          Я подтвердил — обновить
        </Button>
        <Button variant="outline" className="h-11 w-full text-base" onClick={() => navigate('/')} type="button">
          На главную
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
