import { authClient } from '@/lib/auth-client';
import { fetchMe } from '@/lib/me-api';
import { fetchOrganizations } from '@/lib/organizations-api';
import { completeFounderSetup } from '@/lib/register-api';

export async function syncSessionAfterAuth() {
  const result = await authClient.getSession();
  if (result.error) {
    throw new Error(result.error.message ?? 'Не удалось обновить сессию');
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
    throw new Error(result.error.message);
  }

  return firstOrg.id;
}

export async function setActiveOrganization(organizationId: string) {
  const result = await authClient.organization.setActive({ organizationId });
  if (result.error) {
    throw new Error(result.error.message);
  }
}

export function isEmailVerificationError(message: string) {
  return /email.*verif|verif.*email|EMAIL_NOT_VERIFIED/i.test(message);
}
