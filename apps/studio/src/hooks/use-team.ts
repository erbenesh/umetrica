import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAuthErrorMessage } from '@/lib/auth-messages';
import { appToast } from '@/lib/app-toast';
import { authClient } from '@/lib/auth-client';
import { setActiveOrganization } from '@/lib/auth-helpers';
import { meQueryKey } from '@/hooks/use-me';
import { organizationsQueryKey } from '@/hooks/use-organizations';

export const teamMembersQueryKey = ['team', 'members'] as const;
export const teamInvitationsQueryKey = ['team', 'invitations'] as const;
export const userInvitationsQueryKey = ['team', 'user-invitations'] as const;

export function useTeamMembers(enabled = true) {
  return useQuery({
    queryKey: teamMembersQueryKey,
    enabled,
    queryFn: async () => {
      const result = await authClient.organization.listMembers();
      if (result.error) throw new Error(getAuthErrorMessage(result.error));
      return result.data;
    },
  });
}

export function useTeamInvitations(enabled = true) {
  return useQuery({
    queryKey: teamInvitationsQueryKey,
    enabled,
    queryFn: async () => {
      const result = await authClient.organization.listInvitations();
      if (result.error) throw new Error(getAuthErrorMessage(result.error));
      return result.data ?? [];
    },
  });
}

export function useUserInvitations() {
  return useQuery({
    queryKey: userInvitationsQueryKey,
    queryFn: async () => {
      const result = await authClient.organization.listUserInvitations();
      if (result.error) throw new Error(getAuthErrorMessage(result.error));
      return result.data ?? [];
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; role: 'viewer' | 'admin' }) => {
      const result = await authClient.organization.inviteMember({
        email: payload.email,
        role: payload.role,
      });
      if (result.error) throw new Error(getAuthErrorMessage(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamInvitationsQueryKey });
      appToast.success('Приглашение отправлено');
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.cancelInvitation({ invitationId });
      if (result.error) throw new Error(getAuthErrorMessage(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamInvitationsQueryKey });
      appToast.success('Приглашение отменено');
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const result = await authClient.organization.removeMember({ memberIdOrEmail: memberId });
      if (result.error) throw new Error(getAuthErrorMessage(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMembersQueryKey });
      appToast.success('Участник удалён');
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { memberId: string; role: 'viewer' | 'admin' }) => {
      const result = await authClient.organization.updateMemberRole(payload);
      if (result.error) throw new Error(getAuthErrorMessage(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMembersQueryKey });
      appToast.success('Роль обновлена');
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.acceptInvitation({ invitationId });
      if (result.error) throw new Error(getAuthErrorMessage(result.error));
      return result.data;
    },
    onSuccess: async (data) => {
      const organizationId =
        data && typeof data === 'object' && 'organizationId' in data
          ? String(data.organizationId)
          : data && typeof data === 'object' && 'member' in data && data.member && typeof data.member === 'object' && 'organizationId' in data.member
            ? String(data.member.organizationId)
            : null;

      if (organizationId) {
        await setActiveOrganization(organizationId);
      }

      queryClient.invalidateQueries({ queryKey: meQueryKey });
      queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
      queryClient.invalidateQueries();
      appToast.success('Вы присоединились к команде');
    },
  });
}

export function useRejectInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.rejectInvitation({ invitationId });
      if (result.error) throw new Error(getAuthErrorMessage(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userInvitationsQueryKey });
      appToast.success('Приглашение отклонено');
    },
  });
}
