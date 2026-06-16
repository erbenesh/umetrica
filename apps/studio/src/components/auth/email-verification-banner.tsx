import { Link } from 'react-router-dom';

import { useMe } from '@/hooks/use-me';

export function EmailVerificationBanner() {
  const { data: me } = useMe();

  if (!me || me.user.emailVerified) {
    return null;
  }

  return (
    <div className="app-banner">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-insight-warning/30 bg-insight-warning/8 px-3 py-2 text-xs">
        <span>
          Подтвердите email ({me.user.email}), чтобы принимать приглашения и работать с командой.
        </span>
        <Link to="/verify-email" className="shrink-0 font-medium text-primary hover:underline">
          Подтвердить
        </Link>
      </div>
    </div>
  );
}
