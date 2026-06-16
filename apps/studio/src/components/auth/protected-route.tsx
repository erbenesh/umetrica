import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { SESSION_REQUIRED_MESSAGE } from '@/lib/auth-messages';
import { useSession } from '@/lib/auth-client';

export function ProtectedRoute() {
  const location = useLocation();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{
          message: SESSION_REQUIRED_MESSAGE,
          from: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}
