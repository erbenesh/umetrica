import { useQuery } from '@tanstack/react-query';

import { fetchInvitationPreview } from '@/lib/invitations-api';

export function useInvitationPreview(invitationId?: string) {
  return useQuery({
    queryKey: ['invitation', 'preview', invitationId],
    queryFn: () => fetchInvitationPreview(invitationId!),
    enabled: Boolean(invitationId),
    retry: false,
  });
}
