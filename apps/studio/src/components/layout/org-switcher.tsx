import { Building2, ChevronDown, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { OrgLogo } from '@/components/user-avatar';

import { Dropdown, DropdownDivider, DropdownMenu, DropdownTrigger } from '@/components/ui/dropdown';
import { MenuItem } from '@/components/ui/menu-item';
import { useMe } from '@/hooks/use-me';
import { useOrganizations, useSwitchOrganization } from '@/hooks/use-organizations';

export function OrgSwitcher() {
  const { data: me } = useMe();
  const { data: orgs, isLoading } = useOrganizations();
  const switchOrg = useSwitchOrganization();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Компании...
      </div>
    );
  }

  if (!orgs?.organizations.length) {
    return (
      <Link
        to="/onboarding"
        className="workspace-switcher"
      >
        <span className="workspace-switcher__icon">
          <Building2 className="size-[18px]" strokeWidth={1.75} />
        </span>
        <span className="workspace-switcher__body">
          <span className="workspace-switcher__name">Новая компания</span>
          <span className="workspace-switcher__hint">Создать workspace</span>
        </span>
      </Link>
    );
  }

  const activeId = me?.session.activeOrganizationId ?? orgs.organizations[0]?.id;
  const activeOrg = orgs.organizations.find((org) => org.id === activeId) ?? orgs.organizations[0]!;
  const hasMultiple = orgs.organizations.length > 1;

  return (
    <Dropdown block>
      <DropdownTrigger className="workspace-switcher" disabled={switchOrg.isPending}>
        <span className="workspace-switcher__icon">
          {activeOrg.logo ? (
            <OrgLogo
              name={activeOrg.name}
              logo={activeOrg.logo}
              cacheKey={activeOrg.id}
              className="size-[18px] rounded-[4px]"
              fallbackClassName="workspace-switcher__icon-fallback"
            />
          ) : (
            <Building2 className="size-[18px]" strokeWidth={1.75} />
          )}
        </span>
        <span className="workspace-switcher__body">
          <span className="workspace-switcher__name">{activeOrg.name}</span>
          <span className="workspace-switcher__hint">Компания</span>
        </span>
        <ChevronDown className="workspace-switcher__chev" strokeWidth={1.75} />
      </DropdownTrigger>

      <DropdownMenu>
        {hasMultiple
          ? orgs.organizations.map((org) => (
              <MenuItem
                key={org.id}
                icon={Building2}
                active={org.id === activeId}
                disabled={switchOrg.isPending}
                onClick={() => switchOrg.mutate(org.id)}
              >
                {org.name}
              </MenuItem>
            ))
          : null}
        {hasMultiple ? <DropdownDivider /> : null}
        <MenuItem icon={Plus} variant="muted" to="/onboarding">
          Новая компания
        </MenuItem>
      </DropdownMenu>
    </Dropdown>
  );
}
