import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMe } from '@/hooks/use-me';
import { sendVerificationEmail } from '@/lib/auth-client';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me, refetch } = useMe();
  const [status, setStatus] = useState<string | null>(
    (location.state as { message?: string } | null)?.message ?? null,
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email подтверждён</CardTitle>
            <CardDescription>Можно продолжать работу в umetrica.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/')}>
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Подтвердите email</CardTitle>
          <CardDescription>
            Мы отправили письмо на {me?.user.email ?? 'ваш адрес'}. Подтверждение нужно для входа в
            компанию и приёма приглашений.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            В dev-режиме ссылка печатается в консоли API-сервера.
          </p>
          {status && <p className="text-sm text-insight-info">{status}</p>}
          <Button className="w-full" disabled={isSending} onClick={handleResend}>
            {isSending ? 'Отправка...' : 'Отправить письмо снова'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => refetch()}>
            Я подтвердил — обновить статус
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
            На главную
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
