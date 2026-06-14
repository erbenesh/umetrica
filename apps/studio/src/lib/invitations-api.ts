export interface InvitationPreview {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  organizationName: string;
  expired: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function fetchInvitationPreview(invitationId: string) {
  return fetch(`${API_BASE}/api/invitations/${invitationId}/preview`).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Invitation not found');
    }
    return data.invitation as InvitationPreview;
  });
}

export function prepareInvitationAccept(invitationId: string) {
  return fetch(`${API_BASE}/api/invitations/${invitationId}/prepare-accept`, {
    method: 'POST',
    credentials: 'include',
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to prepare invitation');
    }
    return data.invitation as InvitationPreview;
  });
}

export function confirmInvitationSignupEmail(invitationId: string, email: string) {
  return fetch(`${API_BASE}/api/invitations/${invitationId}/confirm-signup-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to confirm email');
    }
    return data as { status: boolean };
  });
}
