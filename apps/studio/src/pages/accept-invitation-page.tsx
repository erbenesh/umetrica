import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { AuthField } from '@/components/auth/auth-field';
import { AuthLoadingStatus, AuthStatusMessage } from '@/components/auth/auth-status';
import { PasswordField } from '@/components/auth/password-field';
import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Button } from '@/components/ui/button';
import { useAcceptInvitation } from '@/hooks/use-team';
import { useInvitationPreview } from '@/hooks/use-invitation-preview';
import { signIn, signOut, signUp, useSession } from '@/lib/auth-client';
import { isEmailVerificationError, syncSessionAfterAuth } from '@/lib/auth-helpers';
import { confirmInvitationSignupEmail, prepareInvitationAccept } from '@/lib/invitations-api';

const schema = z.object({
  name: z.string().min(2, 'Укажите имя').optional(),
  email: z.string().email('Укажите корректный email'),
  password: z.string().min(8, 'Пароль — минимум 8 символов'),
});

type FormData = z.infer<typeof schema>;

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  viewer: 'Наблюдатель',
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

function InvitationAuthShell({
  brandTitle,
  brandDescription,
  panelTitle,
  panelDescription,
  footer,
  children,
}: {
  brandTitle: string;
  brandDescription?: string;
  panelTitle: string;
  panelDescription?: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <AuthSplitLayout
      topbar="mark"
      showBrandBlock={false}
      brandTitle={brandTitle}
      brandDescription={brandDescription ?? ''}
      panelTitle={panelTitle}
      panelDescription={panelDescription}
      footer={footer}
    >
      {children}
    </AuthSplitLayout>
  );
}

export function AcceptInvitationPage() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: preview, isLoading: previewLoading, error: previewError } = useInvitationPreview(invitationId);
  const acceptInvitation = useAcceptInvitation();

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const acceptStartedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!preview?.email) return;
    reset({
      email: preview.email,
      password: '',
      name: '',
    });
  }, [preview?.email, reset]);

  const sessionEmailMatches =
    session?.user.email.toLowerCase() === preview?.email.toLowerCase();

  const completeInvitation = useCallback(async () => {
    if (!invitationId || acceptStartedRef.current) return;
    acceptStartedRef.current = true;
    setError(null);
    setJoining(true);

    try {
      await prepareInvitationAccept(invitationId);
      await acceptInvitation.mutateAsync(invitationId);
      await queryClient.invalidateQueries();
      navigate('/', { replace: true });
    } catch (err) {
      acceptStartedRef.current = false;
      setJoining(false);
      setError(err instanceof Error ? err.message : 'Не удалось принять приглашение');
    }
  }, [invitationId, acceptInvitation, queryClient, navigate]);

  useEffect(() => {
    if (sessionPending || !session || !preview || preview.expired || !sessionEmailMatches) return;
    void completeInvitation();
  }, [session, sessionPending, preview, sessionEmailMatches, completeInvitation]);

  const onSubmit = async (data: FormData) => {
    if (!invitationId || !preview) return;

    setError(null);

    if (data.email.toLowerCase() !== preview.email.toLowerCase()) {
      setError(`Используйте email из приглашения: ${preview.email}`);
      return;
    }

    try {
      if (mode === 'login') {
        const result = await signIn.email({
          email: data.email,
          password: data.password,
        });
        if (result.error) {
          if (isEmailVerificationError(result.error.message ?? '')) {
            await prepareInvitationAccept(invitationId);
            await syncSessionAfterAuth();
            await completeInvitation();
            return;
          }
          throw new Error(result.error.message);
        }
      } else {
        const result = await signUp.email({
          email: data.email,
          password: data.password,
          name: data.name ?? data.email.split('@')[0] ?? 'User',
        });
        if (result.error) throw new Error(result.error.message);

        await confirmInvitationSignupEmail(invitationId, data.email);

        const signInResult = await signIn.email({
          email: data.email,
          password: data.password,
        });
        if (signInResult.error) {
          throw new Error(signInResult.error.message ?? 'Войдите с созданным паролем');
        }
      }

      await syncSessionAfterAuth();
      await completeInvitation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации');
    }
  };

  if (previewLoading || sessionPending) {
    return (
      <InvitationAuthShell
        brandTitle="Загрузка приглашения"
        brandDescription="Проверяем ссылку и данные компании"
        panelTitle="Подождите"
        panelDescription="Загружаем приглашение..."
      >
        <AuthLoadingStatus>Подождите...</AuthLoadingStatus>
      </InvitationAuthShell>
    );
  }

  if (previewError || !preview) {
    return (
      <InvitationAuthShell
        brandTitle="Приглашение не найдено"
        brandDescription="Ссылка недействительна или уже использована."
        panelTitle="Не удалось открыть"
        panelDescription="Попросите администратора отправить новое приглашение."
      />
    );
  }

  if (preview.expired) {
    return (
      <InvitationAuthShell
        brandTitle={`Приглашение в «${preview.organizationName}»`}
        brandDescription="Срок действия ссылки истёк."
        panelTitle="Приглашение устарело"
        panelDescription={`Попросите администратора компании «${preview.organizationName}» отправить новое приглашение.`}
      />
    );
  }

  if (joining) {
    return (
      <InvitationAuthShell
        brandTitle={`Вас ждут в «${preview.organizationName}»`}
        brandDescription="Добавляем вас в команду"
        panelTitle={`Присоединяем к «${preview.organizationName}»`}
        panelDescription="Добавляем вас в компанию"
      >
        <AuthLoadingStatus>Подождите...</AuthLoadingStatus>
      </InvitationAuthShell>
    );
  }

  const showAuthForm = !session || !sessionEmailMatches;

  if (!showAuthForm) {
    return (
      <InvitationAuthShell
        brandTitle={`Вас ждут в «${preview.organizationName}»`}
        brandDescription={`Роль: ${roleLabel(preview.role)}`}
        panelTitle="Принимаем приглашение"
        panelDescription="Почти готово"
      >
        <AuthLoadingStatus>Подождите...</AuthLoadingStatus>
      </InvitationAuthShell>
    );
  }

  return (
    <InvitationAuthShell
      brandTitle={`Вас ждут в «${preview.organizationName}»`}
      brandDescription={`Роль: ${roleLabel(preview.role)}. Без отдельной компании — сразу в команду пригласившего.`}
      panelTitle="Присоединиться"
      panelDescription={`Email из приглашения: ${preview.email}`}
      footer={
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          aria-label={mode === 'login' ? 'Переключиться на регистрацию' : 'Переключиться на вход'}
          onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
        >
          {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
        </button>
      }
    >
      {session && !sessionEmailMatches && (
        <div
          className="mb-4 space-y-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs"
          role="status"
        >
          <p className="text-muted-foreground">
            Вы вошли как <span className="text-foreground">{session.user.email}</span>. Для
            приглашения нужен <span className="text-foreground">{preview.email}</span>.
          </p>
          <Button variant="outline" size="sm" onClick={() => signOut()} type="button">
            Выйти и войти другим аккаунтом
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-fields">
          {mode === 'register' && (
            <AuthField
              id="name"
              label="Имя"
              placeholder="Анна"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />
          )}
          <AuthField
            id="email"
            label="Email"
            type="email"
            readOnly
            hint="Адрес из приглашения, изменить нельзя"
            aria-readonly="true"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordField
            id="password"
            label="Пароль"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {error ? <AuthStatusMessage variant="error">{error}</AuthStatusMessage> : null}

        <div className="form-actions">
          <Button
            type="submit"
            className="h-11 w-full text-base"
            disabled={isSubmitting || joining}
            aria-busy={isSubmitting || joining}
          >
            {isSubmitting
              ? 'Загрузка...'
              : mode === 'login'
                ? 'Войти и присоединиться'
                : 'Зарегистрироваться и присоединиться'}
          </Button>
        </div>
      </form>
    </InvitationAuthShell>
  );
}
