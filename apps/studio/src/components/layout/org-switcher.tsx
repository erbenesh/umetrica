import { Building2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useMe } from '@/hooks/use-me';
import { useOrganizations, useSwitchOrganization } from '@/hooks/use-organizations';

export function OrgSwitcher() {
  const { data: me } = useMe();
  const { data: orgs, isLoading } = useOrganizations();
  const switchOrg = useSwitchOrganization();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Компании...
      </div>
    );
  }

  if (!orgs?.organizations.length) {
    return (
      <div className="px-2 text-xs text-muted-foreground">
        <Link to="/onboarding" className="hover:text-foreground">
          Создать компанию
        </Link>
      </div>
    );
  }

  const activeId = me?.session.activeOrganizationId ?? orgs.organizations[0]?.id;

  return (
    <label className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
      <Building2 className="size-3.5 shrink-0" />
      <select
        className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground"
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
