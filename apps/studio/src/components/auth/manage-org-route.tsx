import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';

import { useMe } from '@/hooks/use-me';
import { canManageOrganization } from '@/lib/me-api';

export function ManageOrgRoute() {
  const { data: me, isPending } = useMe();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Загрузка...
      </div>
    );
  }

  if (!canManageOrganization(me?.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}
