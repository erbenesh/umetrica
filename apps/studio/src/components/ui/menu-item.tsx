import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { useOptionalDropdownContext } from '@/components/ui/dropdown';
import { cn } from '@/lib/utils';

type MenuItemBaseProps = {
  children: ReactNode;
  icon?: LucideIcon;
  active?: boolean;
  variant?: 'default' | 'danger' | 'muted';
  className?: string;
  disabled?: boolean;
};

type MenuItemButtonProps = MenuItemBaseProps & {
  to?: undefined;
  onClick?: () => void;
};

type MenuItemLinkProps = MenuItemBaseProps &
  Pick<LinkProps, 'to' | 'state' | 'replace'> & {
    onClick?: () => void;
  };

export type MenuItemProps = MenuItemButtonProps | MenuItemLinkProps;

function menuItemClassName({
  active,
  variant,
  className,
}: Pick<MenuItemProps, 'active' | 'variant' | 'className'>) {
  return cn(
    'menu-item',
    active && 'is-active',
    variant === 'danger' && 'menu-item--danger',
    variant === 'muted' && 'menu-item--muted',
    className
  );
}

function MenuItemContent({ icon: Icon, children }: Pick<MenuItemProps, 'icon' | 'children'>) {
  return (
    <>
      {Icon ? <Icon className="menu-item__icon" strokeWidth={1.75} /> : null}
      <span className="menu-item__label">{children}</span>
    </>
  );
}

export function MenuItem(props: MenuItemProps) {
  const dropdown = useOptionalDropdownContext();
  const { children, icon, active, variant, className, disabled, onClick } = props;
  const classes = menuItemClassName({ active, variant, className });

  const handleAction = () => {
    if (disabled) return;
    onClick?.();
    dropdown?.setOpen(false);
  };

  if ('to' in props && props.to) {
    return (
      <Link
        to={props.to}
        state={props.state}
        replace={props.replace}
        role="menuitem"
        className={classes}
        onClick={handleAction}
      >
        <MenuItemContent icon={icon}>{children}</MenuItemContent>
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={classes}
      disabled={disabled}
      onClick={handleAction}
    >
      <MenuItemContent icon={icon}>{children}</MenuItemContent>
    </button>
  );
}
