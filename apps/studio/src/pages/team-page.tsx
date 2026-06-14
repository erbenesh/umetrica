import { Loader2, Mail, UserMinus, Users } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useAcceptInvitation,
  useCancelInvitation,
  useInviteMember,
  useRejectInvitation,
  useRemoveMember,
  useTeamInvitations,
  useTeamMembers,
  useUpdateMemberRole,
  useUserInvitations,
} from '@/hooks/use-team';
import { useMe } from '@/hooks/use-me';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  viewer: 'Наблюдатель',
  member: 'Участник',
};

const INVITE_ROLES = [
  { value: 'viewer', label: 'Наблюдатель' },
  { value: 'admin', label: 'Админ' },
];

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

export function TeamPage() {
  const { data: me } = useMe();
  const hasOrganization = Boolean(me?.organization?.id);
  const { data: membersData, isLoading: membersLoading, error: membersError } = useTeamMembers(hasOrganization);
  const { data: invitations, isLoading: invitationsLoading } = useTeamInvitations(hasOrganization);
  const { data: userInvitations } = useUserInvitations();

  const inviteMember = useInviteMember();
  const cancelInvitation = useCancelInvitation();
  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();
  const acceptInvitation = useAcceptInvitation();
  const rejectInvitation = useRejectInvitation();

  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'admin'>('viewer');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canManage = me?.role === 'owner' || me?.role === 'admin';
  const members = membersData?.members ?? [];

  const handleInvite = async () => {
    setStatusMessage(null);
    if (!email.trim()) return;

    try {
      await inviteMember.mutateAsync({ email: email.trim(), role: inviteRole });
      setEmail('');
      setStatusMessage(`Приглашение отправлено на ${email.trim()}. В dev-режиме ссылка в консоли API.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Не удалось отправить приглашение');
    }
  };

  const pendingInvites = (invitations ?? []).filter((item) => item.status === 'pending');
  const incomingInvites = (userInvitations ?? []).filter((item) => item.status === 'pending');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Команда"
        description={`${me?.organization?.name ?? 'Компания'} · ваша роль: ${roleLabel(me?.role ?? '')}`}
        icon={Users}
      />

      {statusMessage && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{statusMessage}</CardContent>
        </Card>
      )}

      {incomingInvites.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Входящие приглашения</CardTitle>
            <CardDescription>
              Примите приглашение, чтобы присоединиться к компании
              {!me?.user.emailVerified && ' (сначала подтвердите email)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">{invite.organizationName ?? 'Компания'}</p>
                  <p className="text-xs text-muted-foreground">
                    Роль: {roleLabel(String(invite.role))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptInvitation.mutate(invite.id)}
                    disabled={acceptInvitation.isPending}
                  >
                    Принять
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectInvitation.mutate(invite.id)}
                    disabled={rejectInvitation.isPending}
                  >
                    Отклонить
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail size={16} />
              Пригласить участника
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              type="email"
              placeholder="email@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as 'viewer' | 'admin')}
            >
              {INVITE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <Button onClick={handleInvite} disabled={inviteMember.isPending || !email.trim()}>
              {inviteMember.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Пригласить'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!hasOrganization && incomingInvites.length === 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            У вас пока нет компании. Создайте свою на онбординге или дождитесь приглашения.
          </CardContent>
        </Card>
      )}

      {hasOrganization && (
      <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Участники</CardTitle>
          <CardDescription>{membersData?.total ?? 0} в компании</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {membersLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Загрузка...
            </div>
          )}
          {membersError && (
            <p className="text-sm text-destructive">{membersError.message}</p>
          )}
          {members.map((member) => {
            const isSelf = member.userId === me?.user.id;
            const isOwner = member.role === 'owner';

            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">{member.user?.name ?? member.user?.email ?? 'Участник'}</p>
                  <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && !isOwner && !isSelf ? (
                    <select
                      className="h-9 rounded-lg border border-border bg-card px-2 text-xs"
                      value={member.role}
                      disabled={updateRole.isPending}
                      onChange={(event) =>
                        updateRole.mutate({
                          memberId: member.id,
                          role: event.target.value as 'viewer' | 'admin',
                        })
                      }
                    >
                      <option value="viewer">Наблюдатель</option>
                      <option value="admin">Админ</option>
                    </select>
                  ) : (
                    <span className="rounded-full border border-border px-2 py-1 text-xs">
                      {roleLabel(member.role)}
                    </span>
                  )}
                  {canManage && !isOwner && !isSelf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={removeMember.isPending}
                      onClick={() => {
                        if (confirm('Удалить участника из компании?')) {
                          removeMember.mutate(member.id);
                        }
                      }}
                    >
                      <UserMinus size={14} className="text-insight-warning" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ожидающие приглашения</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitationsLoading && (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            )}
            {!invitationsLoading && pendingInvites.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет активных приглашений</p>
            )}
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3'
                )}
              >
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(String(invite.role))} · до{' '}
                    {new Date(invite.expiresAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancelInvitation.isPending}
                  onClick={() => cancelInvitation.mutate(invite.id)}
                >
                  Отменить
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
}
