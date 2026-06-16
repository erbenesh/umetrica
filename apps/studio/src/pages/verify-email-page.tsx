import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AuthLoadingStatus, AuthStatusMessage } from '@/components/auth/auth-status';
import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Button } from '@/components/ui/button';
import { useMe } from '@/hooks/use-me';
import { sendVerificationEmail } from '@/lib/auth-client';
import { appToast } from '@/lib/app-toast';
import { BRAND_NAME_RU } from '@/lib/brand';

const REGISTRATION_SUCCESS_MESSAGE =
  'Аккаунт создан. Подтвердите email — после входа мы автоматически создадим вашу компанию.';

export { REGISTRATION_SUCCESS_MESSAGE };

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me, refetch, isLoading } = useMe();
  const registrationToastShown = useRef(false);
  const initialMessage = (location.state as { message?: string } | null)?.message ?? null;
  const isRegistrationSuccess = initialMessage === REGISTRATION_SUCCESS_MESSAGE;
  const [status, setStatus] = useState<string | null>(initialMessage);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (message) setStatus(message);
  }, [location.state]);

  useEffect(() => {
    if (!isRegistrationSuccess || registrationToastShown.current) return;
    registrationToastShown.current = true;
    appToast.success('Регистрация прошла успешно. Подтвердите email.');
  }, [isRegistrationSuccess]);

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
      const message = 'Письмо отправлено. Проверьте почту или консоль API в dev-режиме.';
      setStatus(message);
      appToast.success(message);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Не удалось отправить письмо');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <AuthSplitLayout
        topbar="mark"
        showBrandBlock={false}
        brandTitle="Почти готово"
        brandDescription="Подтверждение email защищает ваш аккаунт и компанию."
        panelTitle="Подтвердите email"
        panelDescription="Загружаем данные аккаунта"
      >
        <AuthLoadingStatus>Загрузка...</AuthLoadingStatus>
      </AuthSplitLayout>
    );
  }

  if (me?.user.emailVerified) {
    return (
      <AuthSplitLayout
        topbar="mark"
        showBrandBlock={false}
        brandTitle="Доступ открыт"
        brandDescription="Email подтверждён — можно работать с дашбордами и инсайтами."
        panelTitle="Email подтверждён"
        panelDescription={`Можно продолжать работу в ${BRAND_NAME_RU}`}
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
      panelTitle={isRegistrationSuccess ? 'Аккаунт создан' : 'Подтвердите email'}
      panelDescription={
        isRegistrationSuccess ? (
          'Осталось подтвердить email — письмо уже отправлено.'
        ) : (
          <>
            Письмо отправлено на <strong>{me?.user.email ?? 'ваш адрес'}</strong>
          </>
        )
      }
    >
      <p className="m-0 text-sm text-foreground-secondary">
        После подтверждения и входа компания создастся автоматически.
      </p>

      {status ? (
        <AuthStatusMessage variant={isRegistrationSuccess ? 'success' : 'info'}>{status}</AuthStatusMessage>
      ) : null}

      <div className="form-actions form-actions--tight">
        <Button
          className="h-11 w-full text-base"
          disabled={isSending || !me?.user.email}
          onClick={handleResend}
          type="button"
          aria-busy={isSending}
        >
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
