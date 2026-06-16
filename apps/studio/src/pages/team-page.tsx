import { Loader2, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
  DataTableToolbar,
} from '@/components/doc/data-table';
import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { ListSearchInput, matchesListQuery } from '@/components/doc/list-search-input';
import { Button, buttonVariants } from '@/components/ui/button';
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

type MemberFilter = 'all' | 'admin' | 'viewer';

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

function userInitial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || '?';
  return source.charAt(0).toUpperCase();
}

function formatInviteExpiry(value: string | Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function roleTagClass(role: string) {
  if (role === 'owner') return 'db-tag db-tag--orange';
  if (role === 'admin') return 'db-tag db-tag--blue';
  return 'db-tag db-tag--gray';
}

export function TeamPage() {
  const { data: me } = useMe();
  const hasOrganization = Boolean(me?.organization?.id);
  const orgName = me?.organization?.name ?? 'Компания';
  const myRole = roleLabel(me?.role ?? '');

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
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canManage = me?.role === 'owner' || me?.role === 'admin';
  const members = membersData?.members ?? [];
  const pendingInvites = (invitations ?? []).filter((item) => item.status === 'pending');
  const incomingInvites = (userInvitations ?? []).filter((item) => item.status === 'pending');

  const filteredMembers = useMemo(() => {
    let result = members;

    if (memberFilter === 'admin') {
      result = result.filter((member) => member.role === 'admin' || member.role === 'owner');
    } else if (memberFilter === 'viewer') {
      result = result.filter((member) => member.role === 'viewer');
    }

    return result.filter((member) =>
      matchesListQuery(memberSearch, member.user.name, member.user.email, roleLabel(member.role))
    );
  }, [memberFilter, memberSearch, members]);

  const handleInvite = async () => {
    setStatusMessage(null);
    if (!email.trim()) return;

    const trimmed = email.trim();

    try {
      await inviteMember.mutateAsync({ email: trimmed, role: inviteRole });
      setEmail('');
      setStatusMessage(`Приглашение отправлено на ${trimmed}. В dev-режиме ссылка в консоли API.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Не удалось отправить приглашение');
    }
  };

  return (
    <DocPage
      title="Команда"
      lead={`Управление доступом к компании ${orgName}`}
      icon={Users}
      mobileTitle="Команда"
      mobileSubtitle={`${orgName} · ${myRole}`}
      props={[
        { label: 'Участников', value: String(members.length) },
        { label: 'Приглашений', value: String(pendingInvites.length) },
        { label: 'Ваша роль', value: myRole },
      ]}
    >
      {canManage && me && !me.user.emailVerified ? (
        <DocCallout className="mb-0">
          <span>
            Подтвердите email ({me.user.email}), чтобы приглашать участников.
          </span>
          <Link to="/verify-email">Подтвердить →</Link>
        </DocCallout>
      ) : null}

      {statusMessage ? <DocCallout variant="info">{statusMessage}</DocCallout> : null}

      {incomingInvites.length > 0 ? (
        <DocBlock title="Входящие приглашения">
          <div className="db">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Компания</th>
                  <th style={{ width: 140 }}>Роль</th>
                  <th style={{ width: 180 }} />
                </tr>
              </thead>
              <tbody>
                {incomingInvites.map((invite) => (
                  <tr key={invite.id}>
                    <td>
                      <div className="db-cell">
                        <span className="db-cell__title">{invite.organizationName ?? 'Компания'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="db-cell">
                        <span className={roleTagClass(String(invite.role))}>{roleLabel(String(invite.role))}</span>
                      </div>
                    </td>
                    <td>
                      <div className="db-cell db-cell--actions">
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => acceptInvitation.mutate(invite.id)}
                          disabled={acceptInvitation.isPending}
                        >
                          Принять
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => rejectInvitation.mutate(invite.id)}
                          disabled={rejectInvitation.isPending}
                        >
                          Отклонить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!me?.user.emailVerified ? (
            <p className="mt-2 text-xs text-muted-foreground">Сначала подтвердите email.</p>
          ) : null}
        </DocBlock>
      ) : null}

      {canManage && hasOrganization ? (
        <DocBlock title="Пригласить" hint="· новый участник">
          <form
            className="invite-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleInvite();
            }}
          >
            <div className="field">
              <label htmlFor="invite-email">Email</label>
              <input
                className="input"
                id="invite-email"
                type="email"
                placeholder="colleague@company.ru"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={inviteMember.isPending}
              />
            </div>
            <div className="field">
              <label htmlFor="invite-role">Роль</label>
              <select
                className="input"
                id="invite-role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as 'viewer' | 'admin')}
                disabled={inviteMember.isPending}
              >
                {INVITE_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="invite-form__submit">
              <Button type="submit" disabled={inviteMember.isPending || !email.trim()}>
                {inviteMember.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Пригласить'}
              </Button>
            </div>
          </form>
        </DocBlock>
      ) : null}

      {!hasOrganization && incomingInvites.length === 0 ? (
        <DocCallout variant="info">
          У вас пока нет компании. Создайте свою на онбординге или дождитесь приглашения.
        </DocCallout>
      ) : null}

      {hasOrganization ? (
        <>
          <DocBlock title="Участники">
            <DataTable
              toolbar={
                <DataTableToolbar>
                  <button
                    type="button"
                    className={cn('db-view', memberFilter === 'all' && 'is-active')}
                    onClick={() => setMemberFilter('all')}
                  >
                    Все
                  </button>
                  <button
                    type="button"
                    className={cn('db-view', memberFilter === 'admin' && 'is-active')}
                    onClick={() => setMemberFilter('admin')}
                  >
                    Админы
                  </button>
                  <button
                    type="button"
                    className={cn('db-view', memberFilter === 'viewer' && 'is-active')}
                    onClick={() => setMemberFilter('viewer')}
                  >
                    Наблюдатели
                  </button>
                  <span className="db-toolbar__spacer" />
                  <ListSearchInput
                    value={memberSearch}
                    onChange={setMemberSearch}
                    placeholder="Поиск по имени или email"
                  />
                  <span className="text-xs text-muted-foreground">
                    {filteredMembers.length}{' '}
                    {filteredMembers.length === 1 ? 'запись' : 'записей'}
                  </span>
                </DataTableToolbar>
              }
            >
              <DataTableHead>
                <DataTableRow>
                  <DataTableTh>Имя</DataTableTh>
                  <DataTableTh>Email</DataTableTh>
                  <DataTableTh className="w-[160px]">Роль</DataTableTh>
                  <DataTableTh className="w-[56px]" />
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {membersLoading ? (
                  <DataTableRow>
                    <DataTableTd colSpan={4}>
                      <div className="db-cell text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Загрузка...
                      </div>
                    </DataTableTd>
                  </DataTableRow>
                ) : null}
                {membersError ? (
                  <DataTableRow>
                    <DataTableTd colSpan={4}>
                      <div className="db-cell text-destructive">{membersError.message}</div>
                    </DataTableTd>
                  </DataTableRow>
                ) : null}
                {!membersLoading && !membersError && filteredMembers.length === 0 ? (
                  <DataTableRow>
                    <DataTableTd colSpan={4}>
                      <div className="db-cell text-muted-foreground">
                        {memberSearch.trim()
                          ? `Ничего не найдено по запросу «${memberSearch}»`
                          : 'Нет участников в этой группе'}
                      </div>
                    </DataTableTd>
                  </DataTableRow>
                ) : null}
                {filteredMembers.map((member) => {
                  const isSelf = member.userId === me?.user.id;
                  const isOwner = member.role === 'owner';
                  const displayName = member.user?.name ?? member.user?.email ?? 'Участник';

                  return (
                    <DataTableRow key={member.id}>
                      <DataTableTd>
                        <span className="db-cell__avatar">
                          {userInitial(member.user?.name, member.user?.email)}
                        </span>
                        <span className="db-cell__title">{displayName}</span>
                      </DataTableTd>
                      <DataTableTd>
                        <div className="text-muted-foreground">{member.user?.email}</div>
                      </DataTableTd>
                      <DataTableTd>
                        {canManage && !isOwner && !isSelf ? (
                          <select
                            className="db-select"
                            aria-label={`Роль ${displayName}`}
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
                          <span className={roleTagClass(member.role)}>{roleLabel(member.role)}</span>
                        )}
                      </DataTableTd>
                      <DataTableTd actions>
                        {canManage && !isOwner && !isSelf ? (
                          <button
                            type="button"
                            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                            aria-label={`Удалить ${displayName}`}
                            disabled={removeMember.isPending}
                            onClick={() => {
                              if (confirm('Удалить участника из компании?')) {
                                removeMember.mutate(member.id);
                              }
                            }}
                          >
                            <X className="size-4" />
                          </button>
                        ) : null}
                      </DataTableTd>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </DocBlock>

          {canManage ? (
            <DocBlock title="Ожидают ответа">
              <DataTable
                toolbar={
                  <DataTableToolbar>
                    <span className="db-view is-active">Активные</span>
                    <span className="db-toolbar__spacer" />
                    <span className="text-xs text-muted-foreground">
                      {pendingInvites.length}{' '}
                      {pendingInvites.length === 1 ? 'запись' : 'записей'}
                    </span>
                  </DataTableToolbar>
                }
              >
                <DataTableHead>
                  <DataTableRow>
                    <DataTableTh>Email</DataTableTh>
                    <DataTableTh className="w-[140px]">Роль</DataTableTh>
                    <DataTableTh className="w-[140px]">Истекает</DataTableTh>
                    <DataTableTh className="w-[100px]" />
                  </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                  {invitationsLoading ? (
                    <DataTableRow>
                      <DataTableTd colSpan={4}>
                        <div className="db-cell text-muted-foreground">Загрузка...</div>
                      </DataTableTd>
                    </DataTableRow>
                  ) : null}
                  {!invitationsLoading && pendingInvites.length === 0 ? (
                    <DataTableRow>
                      <DataTableTd colSpan={4}>
                        <div className="db-cell text-muted-foreground">Нет активных приглашений</div>
                      </DataTableTd>
                    </DataTableRow>
                  ) : null}
                  {pendingInvites.map((invite) => (
                    <DataTableRow key={invite.id}>
                      <DataTableTd>
                        <span className="db-cell__title">{invite.email}</span>
                      </DataTableTd>
                      <DataTableTd>
                        <span className={roleTagClass(String(invite.role))}>
                          {roleLabel(String(invite.role))}
                        </span>
                      </DataTableTd>
                      <DataTableTd>
                        <div className="tabular-nums text-muted-foreground">
                          {formatInviteExpiry(invite.expiresAt)}
                        </div>
                      </DataTableTd>
                      <DataTableTd actions>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          disabled={cancelInvitation.isPending}
                          onClick={() => cancelInvitation.mutate(invite.id)}
                        >
                          Отменить
                        </Button>
                      </DataTableTd>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </DocBlock>
          ) : null}
        </>
      ) : null}
    </DocPage>
  );
}
