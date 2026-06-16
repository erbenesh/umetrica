import { apiFetch } from '@/lib/api-client';

export interface InvitationPreview {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  organizationName: string;
  expired: boolean;
}

export function fetchInvitationPreview(invitationId: string) {
  return apiFetch<{ invitation: InvitationPreview }>(`/api/invitations/${invitationId}/preview`).then(
    (data) => data.invitation,
  );
}

export function prepareInvitationAccept(invitationId: string) {
  return apiFetch<{ invitation: InvitationPreview }>(
    `/api/invitations/${invitationId}/prepare-accept`,
    { method: 'POST' },
  ).then((data) => data.invitation);
}

export function confirmInvitationSignupEmail(invitationId: string, email: string) {
  return apiFetch<{ status: boolean }>(`/api/invitations/${invitationId}/confirm-signup-email`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
