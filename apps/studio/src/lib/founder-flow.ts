import type { QueryClient } from '@tanstack/react-query';

import { meQueryKey } from '@/hooks/use-me';
import { organizationsQueryKey } from '@/hooks/use-organizations';
import { authClient } from '@/lib/auth-client';
import { appToast } from '@/lib/app-toast';
import { fetchOrganizations } from '@/lib/organizations-api';
import { completeFounderSetup, type FounderSetupResponse } from '@/lib/register-api';

export async function runFounderAutoSetup(queryClient: QueryClient) {
  await authClient.getSession();

  const setup = await completeFounderSetup();

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: organizationsQueryKey }),
    queryClient.invalidateQueries({ queryKey: meQueryKey }),
    queryClient.invalidateQueries(),
  ]);

  const orgs = await fetchOrganizations().catch(() => null);
  const hasOrganization = (orgs?.organizations.length ?? 0) > 0;

  return { setup, hasOrganization };
}

export function notifyFounderSetup(setup: FounderSetupResponse) {
  if (setup.status === 'created') {
    appToast.success(`Компания «${setup.company.name}» создана`);
    return;
  }

  if (setup.status === 'failed') {
    appToast.error(setup.error);
  }
}
