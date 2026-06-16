import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Button } from '@/components/ui/button';
import { requestPasswordReset } from '@/lib/auth-client';

const schema = z.object({
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setMessage(null);

    try {
      const result = await requestPasswordReset({
        email: data.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) throw new Error(result.error.message);
      setMessage('Если аккаунт существует, мы отправили ссылку для сброса пароля.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось отправить письмо');
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-fields">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              {...register('email')}
            />
          </div>
        </div>

        {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}

        <div className="form-actions">
          <Button type="submit" className="h-11 w-full text-base" disabled={isSubmitting}>
            {isSubmitting ? 'Отправка...' : 'Отправить ссылку'}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
