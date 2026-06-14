import { Navigate, Outlet } from 'react-router-dom';

import { useSession } from '@/lib/auth-client';

export function ProtectedRoute() {
  const { data: session, isPending, isRefetching } = useSession();

  if (isPending || isRefetching) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
