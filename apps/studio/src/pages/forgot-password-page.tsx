import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthField } from '@/components/auth/auth-field';
import { AuthStatusMessage } from '@/components/auth/auth-status';
import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Button } from '@/components/ui/button';
import { requestPasswordReset } from '@/lib/auth-client';
import { appToast } from '@/lib/app-toast';

const schema = z.object({
  email: z.string().email('Укажите корректный email'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [status, setStatus] = useState<{ variant: 'info' | 'error'; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setStatus(null);

    try {
      const result = await requestPasswordReset({
        email: data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) throw new Error(result.error.message);
      setStatus({
        variant: 'info',
        message: 'Если аккаунт существует, мы отправили ссылку для сброса пароля.',
      });
      appToast.success('Письмо отправлено, если аккаунт существует');
    } catch (err) {
      setStatus({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Не удалось отправить письмо',
      });
    }
  };

  return (
    <AuthSplitLayout
      topbar="mark"
      showBrandBlock={false}
      brandTitle="Восстановление доступа"
      brandDescription="Отправим безопасную ссылку на ваш email."
      panelTitle="Сброс пароля"
      panelDescription="Введите email аккаунта"
      footer={<Link to="/auth">Вернуться ко входу</Link>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-fields">
          <AuthField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            autoFocus
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        {status ? (
          <AuthStatusMessage variant={status.variant}>{status.message}</AuthStatusMessage>
        ) : null}

        <div className="form-actions">
          <Button
            type="submit"
            className="h-11 w-full text-base"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить ссылку'}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
