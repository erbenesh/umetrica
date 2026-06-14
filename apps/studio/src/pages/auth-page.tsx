import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { AuthFooterLink, AuthLayout, AuthModeSwitch } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn } from '@/lib/auth-client';
import { ensureActiveOrganization, isEmailVerificationError, syncSessionAfterAuth } from '@/lib/auth-helpers';
import { registerFounder } from '@/lib/register-api';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Укажите имя'),
  companyName: z.string().min(2, 'Укажите название компании').max(100),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get('invite');

  if (inviteId) {
    return <Navigate to={`/accept-invitation/${inviteId}`} replace />;
  }

  return <AuthPageForm />;
}

function AuthPageForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const stateMessage = (history.state as { usr?: { message?: string } } | null)?.usr?.message;
    if (stateMessage) setInfo(stateMessage);
  }, []);

  const schema = mode === 'login' ? loginSchema : registerSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<LoginFormData | RegisterFormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    reset();
    setError(null);
  }, [mode, reset]);

  const onSubmit = async (data: LoginFormData | RegisterFormData) => {
    setError(null);
    setInfo(null);

    try {
      if (mode === 'login') {
        const loginData = data as LoginFormData;
        const result = await signIn.email({
          email: loginData.email,
          password: loginData.password,
        });
        if (result.error) {
          if (isEmailVerificationError(result.error.message ?? '')) {
            navigate('/verify-email', { replace: true });
            return;
          }
          throw new Error(result.error.message);
        }
        await syncSessionAfterAuth();
        await ensureActiveOrganization();
        navigate('/');
      } else {
        const registerData = data as RegisterFormData;
        await registerFounder({
          email: registerData.email,
          password: registerData.password,
          name: registerData.name,
          companyName: registerData.companyName,
        });
        navigate('/verify-email', {
          replace: true,
          state: {
            message:
              'Аккаунт создан. Подтвердите email — после входа мы автоматически создадим вашу компанию.',
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации');
    }
  };

  return (
    <AuthLayout
      title={mode === 'login' ? 'Вход' : 'Регистрация'}
      description={
        mode === 'login'
          ? 'Войдите в рабочее пространство компании'
          : 'Создайте аккаунт и укажите компанию'
      }
      footer={
        <div className="space-y-2 pt-1">
          {mode === 'login' ? (
            <AuthFooterLink to="/forgot-password">Забыли пароль?</AuthFooterLink>
          ) : null}
          <AuthModeSwitch
            label={mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
            onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {mode === 'register' && (
          <>
            <Input placeholder="Имя" {...register('name')} />
            <Input placeholder="Название компании" {...register('companyName')} />
          </>
        )}
        <Input type="email" placeholder="Email" {...register('email')} />
        <Input type="password" placeholder="Пароль" {...register('password')} />

        {info && <p className="text-xs text-insight-info">{info}</p>}
        {error && <p className="text-xs text-insight-warning">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </Button>
      </form>
    </AuthLayout>
  );
}
