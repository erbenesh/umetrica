import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { AuthLayout, AuthModeSwitch } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAcceptInvitation } from '@/hooks/use-team';
import { useInvitationPreview } from '@/hooks/use-invitation-preview';
import { signIn, signOut, signUp, useSession } from '@/lib/auth-client';
import { isEmailVerificationError, syncSessionAfterAuth } from '@/lib/auth-helpers';
import { confirmInvitationSignupEmail, prepareInvitationAccept } from '@/lib/invitations-api';

const schema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(8),
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

function AuthStatus({
  title,
  description,
  loading = false,
}: {
  title: string;
  description?: string;
  loading?: boolean;
}) {
  return (
    <AuthLayout title={title} description={description}>
      {loading ? (
        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-3.5 animate-spin" />
          Подождите...
        </div>
      ) : null}
    </AuthLayout>
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
    formState: { isSubmitting },
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
    return <AuthStatus title="Загрузка приглашения" loading />;
  }

  if (previewError || !preview) {
    return (
      <AuthStatus
        title="Приглашение не найдено"
        description="Ссылка недействительна или уже использована."
      />
    );
  }

  if (preview.expired) {
    return (
      <AuthStatus
        title="Приглашение устарело"
        description={`Попросите администратора компании «${preview.organizationName}» отправить новое приглашение.`}
      />
    );
  }

  if (joining) {
    return (
      <AuthStatus
        title={`Присоединяем к «${preview.organizationName}»`}
        description="Добавляем вас в компанию"
        loading
      />
    );
  }

  const showAuthForm = !session || !sessionEmailMatches;

  if (!showAuthForm) {
    return <AuthStatus title="Принимаем приглашение" loading />;
  }

  return (
    <AuthLayout
      title={`Приглашение в «${preview.organizationName}»`}
      description={`Роль: ${roleLabel(preview.role)}. Создайте аккаунт или войдите — вы сразу попадёте в компанию.`}
      footer={
        <AuthModeSwitch
          label={mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
          onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
        />
      }
    >
      {session && !sessionEmailMatches && (
        <div className="mb-3 space-y-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs">
          <p className="text-muted-foreground">
            Вы вошли как <span className="text-foreground">{session.user.email}</span>. Для
            приглашения нужен <span className="text-foreground">{preview.email}</span>.
          </p>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Выйти и войти другим аккаунтом
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {mode === 'register' && <Input placeholder="Имя" {...register('name')} />}
        <Input type="email" placeholder="Email" readOnly {...register('email')} />
        <Input type="password" placeholder="Пароль" {...register('password')} />

        {error && <p className="text-xs text-insight-warning">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting || joining}>
          {isSubmitting
            ? 'Загрузка...'
            : mode === 'login'
              ? 'Войти и присоединиться'
              : 'Зарегистрироваться и присоединиться'}
        </Button>
      </form>
    </AuthLayout>
  );
}
