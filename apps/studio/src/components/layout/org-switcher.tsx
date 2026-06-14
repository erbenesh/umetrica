import { Building2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useMe } from '@/hooks/use-me';
import { useOrganizations, useSwitchOrganization } from '@/hooks/use-organizations';
import { cn } from '@/lib/utils';

export function OrgSwitcher() {
  const { data: me } = useMe();
  const { data: orgs, isLoading } = useOrganizations();
  const switchOrg = useSwitchOrganization();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Компании...
      </div>
    );
  }

  if (!orgs?.organizations.length) {
    return (
      <div className="px-1.5 text-[11px] text-muted-foreground">
        <Link to="/onboarding" className="inline-flex items-center gap-1 hover:text-foreground">
          <Building2 className="size-3" />
          Создать компанию
        </Link>
      </div>
    );
  }

  const activeId = me?.session.activeOrganizationId ?? orgs.organizations[0]?.id;

  return (
    <label className="block px-1.5">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
        Компания
      </span>
      <select
        className={cn(
          'h-7 w-full rounded-md border border-border bg-card px-2 text-xs text-foreground',
          switchOrg.isPending && 'opacity-60'
        )}
        value={activeId}
        disabled={switchOrg.isPending || orgs.organizations.length <= 1}
        onChange={(event) => switchOrg.mutate(event.target.value)}
      >
        {orgs.organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </label>
  );
}
