import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { organizationsQueryKey, useOrganizations } from '@/hooks/use-organizations';
import { meQueryKey } from '@/hooks/use-me';
import { useUserInvitations } from '@/hooks/use-team';
import { completeFounderSetup } from '@/lib/register-api';

const ORG_OPTIONAL_PATHS = ['/onboarding', '/team', '/verify-email'];

export function OrgGate() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [founderSetupReady, setFounderSetupReady] = useState(false);

  useEffect(() => {
    let active = true;

    void completeFounderSetup()
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: organizationsQueryKey }),
          queryClient.invalidateQueries({ queryKey: meQueryKey }),
        ]),
      )
      .finally(() => {
        if (active) setFounderSetupReady(true);
      });

    return () => {
      active = false;
    };
  }, [queryClient]);

  const { data: orgs, isLoading: orgsLoading } = useOrganizations();
  const { data: userInvitations, isLoading: invitesLoading } = useUserInvitations();

  if (!founderSetupReady || orgsLoading || invitesLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Загрузка компании...
      </div>
    );
  }

  const hasOrganizations = (orgs?.organizations.length ?? 0) > 0;
  const hasPendingInvites = (userInvitations ?? []).some((item) => item.status === 'pending');
  const isOrgOptionalPath = ORG_OPTIONAL_PATHS.some((path) => location.pathname.startsWith(path));

  if (!hasOrganizations && !hasPendingInvites && !isOrgOptionalPath) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
