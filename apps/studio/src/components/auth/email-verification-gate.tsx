import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useMe } from '@/hooks/use-me';
import { isSessionEmailVerified } from '@/lib/auth-helpers';
import { useSession } from '@/lib/auth-client';

const ALLOWED_WITHOUT_VERIFICATION = ['/verify-email', '/onboarding', '/team'];

export function EmailVerificationGate() {
  const location = useLocation();
  const { data: session } = useSession();
  const { data: me, isLoading } = useMe();

  const isAllowedPath = ALLOWED_WITHOUT_VERIFICATION.some((path) =>
    location.pathname.startsWith(path),
  );

  if (isAllowedPath) {
    return <Outlet />;
  }

  const sessionVerified = isSessionEmailVerified(session);
  const meVerified = me?.user.emailVerified;

  if (!sessionVerified || meVerified === false) {
    if (isLoading && meVerified === undefined && sessionVerified) {
      return (
        <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Проверка email...
        </div>
      );
    }

    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
}
