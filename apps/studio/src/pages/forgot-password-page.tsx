import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

import { AuthFooterLink, AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <AuthLayout
      title="Сброс пароля"
      description="Введите email — пришлём ссылку для нового пароля"
      footer={<AuthFooterLink to="/auth">Вернуться ко входу</AuthFooterLink>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Input type="email" placeholder="Email" {...register('email')} />
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Отправка...' : 'Отправить ссылку'}
        </Button>
      </form>
    </AuthLayout>
  );
}
