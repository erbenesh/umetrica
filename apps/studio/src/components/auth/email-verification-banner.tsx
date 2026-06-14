import { Link } from 'react-router-dom';

import { useMe } from '@/hooks/use-me';

export function EmailVerificationBanner() {
  const { data: me } = useMe();

  if (!me || me.user.emailVerified) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-insight-warning/40 bg-insight-warning/10 px-4 py-3 text-sm">
      <span className="text-foreground">
        Подтвердите email ({me.user.email}), чтобы принимать приглашения и работать с командой.
      </span>{' '}
      <Link to="/verify-email" className="font-medium text-primary hover:underline">
        Подтвердить
      </Link>
    </div>
  );
}
