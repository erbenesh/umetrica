import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AuthStatusMessage } from '@/components/auth/auth-status';
import { PasswordField } from '@/components/auth/password-field';
import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Button } from '@/components/ui/button';
import { resetPassword } from '@/lib/auth-client';

const schema = z
  .object({
    password: z.string().min(8, 'Пароль — минимум 8 символов'),
    confirmPassword: z.string().min(8, 'Повторите пароль'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const error = searchParams.get('error');
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setMessage('Ссылка недействительна. Запросите сброс пароля снова.');
      return;
    }

    setMessage(null);

    try {
      const result = await resetPassword({
        newPassword: data.password,
        token,
      });
      if (result.error) throw new Error(result.error.message);
      navigate('/auth', {
        replace: true,
        state: { message: 'Пароль обновлён. Войдите с новым паролем.' },
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось обновить пароль');
    }
  };

  if (error === 'INVALID_TOKEN' || !token) {
    return (
      <AuthSplitLayout
        topbar="mark"
        showBrandBlock={false}
        brandTitle="Ссылка устарела"
        brandDescription="Запросите новое письмо — мы отправим свежую ссылку для сброса пароля."
        panelTitle="Ссылка недействительна"
        panelDescription="Запросите сброс пароля ещё раз"
        footer={<Link to="/auth">Вернуться ко входу</Link>}
      >
        <div className="form-actions form-actions--tight">
          <Button className="h-11 w-full text-base" onClick={() => navigate('/forgot-password')} type="button">
            Запросить снова
          </Button>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      topbar="mark"
      showBrandBlock={false}
      brandTitle="Новый пароль"
      brandDescription="Минимум 8 символов, используйте уникальный пароль."
      panelTitle="Задайте пароль"
      panelDescription="После сохранения войдите с новым паролем"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-fields">
          <PasswordField
            id="password"
            label="Новый пароль"
            autoComplete="new-password"
            hint="Минимум 8 символов"
            required
            autoFocus
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordField
            id="confirmPassword"
            label="Повторите"
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        {message ? <AuthStatusMessage variant="error">{message}</AuthStatusMessage> : null}

        <div className="form-actions">
          <Button
            type="submit"
            className="h-11 w-full text-base"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить пароль'}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
