import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>umetrica</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Войдите в аналитику' : 'Создайте аккаунт и компанию'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mode === 'register' && (
              <>
                <Input placeholder="Имя" {...register('name')} />
                <Input placeholder="Название компании" {...register('companyName')} />
              </>
            )}
            <Input type="email" placeholder="Email" {...register('email')} />
            <Input type="password" placeholder="Пароль" {...register('password')} />

            {info && <p className="text-sm text-insight-info">{info}</p>}
            {error && <p className="text-sm text-insight-warning">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </form>

          {mode === 'login' && (
            <Link
              to="/forgot-password"
              className="mt-3 block text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Забыли пароль?
            </Link>
          )}

          <button
            type="button"
            className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
          >
            {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
