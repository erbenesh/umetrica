import { authClient } from '@/lib/auth-client';
import { getAuthErrorMessage, isEmailVerificationError } from '@/lib/auth-messages';
import { fetchMe } from '@/lib/me-api';
import { fetchOrganizations } from '@/lib/organizations-api';
import { completeFounderSetup } from '@/lib/register-api';

export { getAuthErrorMessage, isEmailVerificationError };

export async function syncSessionAfterAuth() {
  const result = await authClient.getSession();
  if (result.error) {
    throw new Error(getAuthErrorMessage(result.error, 'Не удалось обновить сессию'));
  }
  return result.data;
}

export async function syncSessionAfterLogin(refetchSession?: () => Promise<void>) {
  if (refetchSession) {
    await refetchSession();
    return;
  }

  return syncSessionAfterAuth();
}

export async function ensureActiveOrganization() {
  await completeFounderSetup();

  const me = await fetchMe().catch(() => null);
  if (me?.session.activeOrganizationId) return me.session.activeOrganizationId;

  const orgs = await fetchOrganizations().catch(() => null);
  const firstOrg = orgs?.organizations[0];
  if (!firstOrg) return null;

  const result = await authClient.organization.setActive({ organizationId: firstOrg.id });
  if (result.error) {
    throw new Error(getAuthErrorMessage(result.error, 'Не удалось выбрать компанию'));
  }

  return firstOrg.id;
}

export async function setActiveOrganization(organizationId: string) {
  const result = await authClient.organization.setActive({ organizationId });
  if (result.error) {
    throw new Error(getAuthErrorMessage(result.error, 'Не удалось выбрать компанию'));
  }
}

export function isSessionEmailVerified(session: { user: { emailVerified?: boolean } } | null | undefined) {
  return session?.user.emailVerified !== false;
}
