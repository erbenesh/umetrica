import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { resetPassword } from '@/lib/auth-client';

const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
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
    formState: { isSubmitting, errors },
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
      navigate('/auth', { replace: true, state: { message: 'Пароль обновлён. Войдите с новым паролем.' } });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось обновить пароль');
    }
  };

  if (error === 'INVALID_TOKEN' || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Ссылка устарела</CardTitle>
            <CardDescription>Запросите сброс пароля ещё раз.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/forgot-password')}>
              Запросить снова
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
          <CardTitle>Новый пароль</CardTitle>
          <CardDescription>Задайте новый пароль для аккаунта.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input type="password" placeholder="Новый пароль" {...register('password')} />
            <Input type="password" placeholder="Повторите пароль" {...register('confirmPassword')} />
            {errors.confirmPassword && (
              <p className="text-sm text-insight-warning">{errors.confirmPassword.message}</p>
            )}
            {message && <p className="text-sm text-insight-warning">{message}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : 'Сохранить пароль'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
