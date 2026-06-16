import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { AuthField, AuthSelectField } from '@/components/auth/auth-field';
import { PasswordField } from '@/components/auth/password-field';
import { AuthLoadingStatus, AuthStatusMessage } from '@/components/auth/auth-status';
import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Button } from '@/components/ui/button';
import { signIn, useSession } from '@/lib/auth-client';
import { ensureActiveOrganization, isEmailVerificationError, syncSessionAfterLogin } from '@/lib/auth-helpers';
import { registerFounder } from '@/lib/register-api';

const CATEGORIES = ['Дом и текстиль', 'Одежда', 'Красота и здоровье', 'Другое'];

const loginSchema = z.object({
  email: z.string().email('Укажите корректный email'),
  password: z.string().min(8, 'Пароль — минимум 8 символов'),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Укажите имя'),
  companyName: z.string().min(2, 'Укажите название компании').max(100, 'Слишком длинное название'),
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
  const { data: session, isPending: sessionPending, refetch: refetchSession } = useSession();
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [category, setCategory] = useState(CATEGORIES[0]);
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
    formState: { errors, isSubmitting },
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
        await syncSessionAfterLogin(refetchSession);
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
            category,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации');
    }
  };

  const isLogin = mode === 'login';
  const registerErrors = errors as FieldErrors<RegisterFormData>;

  if (sessionPending) {
    return (
      <AuthSplitLayout
        topbar="full"
        brandTitle="Загрузка"
        brandDescription=""
        panelTitle="Проверяем сессию"
        panelDescription="Подождите несколько секунд"
      >
        <AuthLoadingStatus>Проверяем сессию…</AuthLoadingStatus>
      </AuthSplitLayout>
    );
  }

  if (session?.user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthSplitLayout
      topbar="full"
      brandTag={isLogin ? 'Аналитика для селлеров' : undefined}
      brandTitle={
        isLogin
          ? 'Аналитика селлера, которая знает рынок'
          : 'Аналитика маркетплейсов с рыночным контекстом'
      }
      brandDescription={
        isLogin
          ? 'Дашборды по вашему кабинету, рыночные тренды и бенчмарки среди похожих продавцов — без обязательного API на старте.'
          : 'Создайте компанию — сначала рыночные инсайты по категории, потом подключите кабинет CSV или API.'
      }
      brandStats={
        isLogin
          ? [
              { value: '3', label: 'уровня инсайтов' },
              { value: '0', label: 'ключей для старта' },
            ]
          : [
              { value: 'WB', label: 'Ozon · Маркет' },
              { value: '152-ФЗ', label: 'данные в РФ' },
            ]
      }
      panelTitle={isLogin ? 'Добро пожаловать' : 'Создать аккаунт'}
      panelDescription={isLogin ? 'Войдите в рабочее пространство компании' : 'Для основателя компании'}
      footer={
        <>
          {isLogin ? <Link to="/forgot-password">Забыли пароль?</Link> : null}
          <span>
            {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <Link to={isLogin ? '/auth?mode=register' : '/auth'}>
              {isLogin ? 'Регистрация' : 'Войти'}
            </Link>
          </span>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-fields">
          {!isLogin ? (
            <>
              <AuthField
                id="name"
                label="Имя"
                placeholder="Егор"
                autoComplete="name"
                required
                error={registerErrors.name?.message}
                autoFocus
                {...register('name')}
              />
              <AuthField
                id="company"
                label="Магазин / компания"
                placeholder="HomeStyle"
                autoComplete="organization"
                required
                error={registerErrors.companyName?.message}
                {...register('companyName')}
              />
              <AuthSelectField
                id="category"
                label="Категория (для рыночных инсайтов)"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </AuthSelectField>
            </>
          ) : null}
          <AuthField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            error={errors.email?.message}
            autoFocus={isLogin}
            {...register('email')}
          />
          <PasswordField
            id="password"
            label="Пароль"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            hint={isLogin ? undefined : 'Минимум 8 символов'}
            required
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {info ? <AuthStatusMessage variant="info">{info}</AuthStatusMessage> : null}
        {error ? <AuthStatusMessage variant="error">{error}</AuthStatusMessage> : null}

        <div className="form-actions">
          <Button
            type="submit"
            className="h-11 w-full text-base"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
