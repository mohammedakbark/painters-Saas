'use client';

import { type ReactNode, useSyncExternalStore, useTransition } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { LogoMark } from '@/components/brand/logo-mark';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import {
  Menu,
  MenuButton,
  MenuLabel,
  MenuLink,
  MenuSeparator,
} from '@/components/ui/menu';
import { cn } from '@/lib/cn';
import { type NavItem, NavLinks } from './nav-links';

export interface ShellArea {
  /** Small caption above the name, e.g. "Shop" or "Admin area". */
  caption: string;
  /** The shop name, or "Platform Admin". */
  name: string;
  /** Other areas to switch to (the user's shops), shown in a menu. */
  switcher?: {
    items: readonly { href: string; label: string; current: boolean }[];
    links: readonly { href: string; label: string; icon: IconName }[];
  };
}

export interface ShellLink {
  href: string;
  label: string;
  icon: IconName;
}

const STORAGE_KEY = 'sevenpalette.sidebar.collapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(STORAGE_KEY, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(STORAGE_KEY, onChange);
  };
}

/**
 * Console layout (WEB-004, WEB-005). Desktop: a sticky sidebar that can be
 * collapsed to icons (remembered on this device), the current area with a
 * switcher at the top and the account menu at the bottom. Phones and
 * tablets: a top bar with the same parts and scrollable navigation.
 */
export function AppShell({
  area,
  nav,
  account,
  accountLinks = [],
  signOutAction,
  children,
}: {
  area: ShellArea;
  nav: readonly NavItem[];
  /** Who is signed in (email or phone number). */
  account: string;
  /** Extra items in the account menu, e.g. the shop profile. */
  accountLinks?: readonly ShellLink[];
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  // Remembered on this device; the server and first render are expanded.
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const toggle = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '0' : '1');
    } catch {
      // Storage can be blocked; the sidebar then stays as it is.
    }
    window.dispatchEvent(new Event(STORAGE_KEY));
  };

  return (
    <div
      className={cn(
        'min-h-dvh bg-surface-subtle desktop:grid desktop:transition-[grid-template-columns] desktop:duration-200',
        collapsed
          ? 'desktop:grid-cols-[4.5rem_minmax(0,1fr)]'
          : 'desktop:grid-cols-[var(--container-sidebar)_minmax(0,1fr)]',
      )}
    >
      <aside className="hidden border-r border-border-default bg-surface-default desktop:sticky desktop:top-0 desktop:flex desktop:h-dvh desktop:flex-col">
        <div
          className={cn(
            'flex items-center pt-5 pb-4',
            collapsed ? 'justify-center px-2' : 'px-5',
          )}
        >
          {collapsed ? <LogoMark className="h-6" /> : <BrandMark />}
        </div>
        <div className={cn('mb-4', collapsed ? 'px-2' : 'px-3')}>
          <AreaSwitcher area={area} collapsed={collapsed} />
        </div>
        <NavLinks items={nav} orientation="vertical" collapsed={collapsed} />
        <div
          className={cn(
            'mt-auto flex',
            collapsed ? 'justify-center px-2' : 'px-3',
          )}
        >
          <IconButton
            icon="panelLeft"
            label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
            aria-expanded={!collapsed}
            onClick={toggle}
          />
        </div>
        <div
          className={cn(
            'border-t border-border-default',
            collapsed ? 'p-2' : 'p-3',
          )}
        >
          <AccountMenu
            account={account}
            links={accountLinks}
            signOutAction={signOutAction}
            collapsed={collapsed}
            side="top"
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-b border-border-default bg-surface-default desktop:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <BrandMark />
            <AccountMenu
              account={account}
              links={accountLinks}
              signOutAction={signOutAction}
              collapsed
              side="bottom"
            />
          </div>
          <div className="px-4 pb-3">
            <AreaSwitcher area={area} collapsed={false} />
          </div>
          <NavLinks items={nav} orientation="horizontal" />
        </header>
        <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-6 px-4 py-6 medium:px-6 desktop:px-10 desktop:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

/** The first letter of a name, for the round avatar. */
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

function Avatar({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'brand' | 'soft';
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-badge text-body font-bold',
        tone === 'brand'
          ? 'bg-brand-primary text-surface-default'
          : 'bg-brand-primary-soft text-brand-primary',
      )}
    >
      {children}
    </span>
  );
}

/** The current shop (or area) with a menu to switch to another one. */
function AreaSwitcher({
  area,
  collapsed,
}: {
  area: ShellArea;
  collapsed: boolean;
}) {
  const summary = (
    <span className="flex w-full min-w-0 items-center gap-3 text-left">
      <Avatar tone="brand">{initial(area.name)}</Avatar>
      {collapsed ? null : (
        <>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
              {area.caption}
            </span>
            <span className="truncate text-body font-semibold text-text-primary">
              {area.name}
            </span>
          </span>
          {area.switcher ? (
            <Icon
              name="chevronsUpDown"
              className="size-4 text-text-secondary"
            />
          ) : null}
        </>
      )}
    </span>
  );

  if (!area.switcher) {
    return (
      <div
        title={collapsed ? area.name : undefined}
        className={cn(
          'rounded-panel bg-surface-subtle',
          collapsed ? 'p-1.5' : 'px-3 py-2.5',
        )}
      >
        {summary}
      </div>
    );
  }

  return (
    <Menu
      label={`${area.caption}: ${area.name}. Switch`}
      align="start"
      className="w-full"
      triggerClassName={cn(
        'w-full rounded-panel bg-surface-subtle hover:bg-brand-primary-soft',
        collapsed ? 'justify-center p-1.5' : 'px-3 py-2.5',
      )}
      trigger={summary}
    >
      <MenuLabel>Your shops</MenuLabel>
      {area.switcher.items.map((item) => (
        <MenuLink key={item.href} href={item.href}>
          <span className="flex-1 truncate">{item.label}</span>
          {item.current ? (
            <Icon name="check" className="size-4 text-brand-primary" />
          ) : null}
        </MenuLink>
      ))}
      <MenuSeparator />
      {area.switcher.links.map((link) => (
        <MenuLink key={link.href} href={link.href}>
          <Icon name={link.icon} className="size-4" />
          {link.label}
        </MenuLink>
      ))}
    </Menu>
  );
}

/** Who is signed in, their account links and Sign out. */
function AccountMenu({
  account,
  links,
  signOutAction,
  collapsed,
  side,
}: {
  account: string;
  links: readonly ShellLink[];
  signOutAction: () => Promise<void>;
  collapsed: boolean;
  side: 'top' | 'bottom';
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Menu
      label={`Account: ${account}`}
      align={side === 'top' ? 'start' : 'end'}
      side={side}
      className={side === 'top' ? 'w-full' : undefined}
      triggerClassName={cn(
        'hover:bg-surface-subtle',
        side === 'top' ? 'w-full px-2 py-2' : 'px-1',
        collapsed && side === 'top' && 'justify-center px-0',
      )}
      trigger={
        <span className="flex min-w-0 items-center gap-3 text-left">
          <Avatar tone="soft">
            <Icon name="user" className="size-5" />
          </Avatar>
          {collapsed ? null : (
            <span className="flex min-w-0 flex-col">
              <span className="text-caption text-text-secondary">
                Signed in as
              </span>
              <span className="truncate text-body font-medium text-text-primary">
                {account}
              </span>
            </span>
          )}
        </span>
      }
    >
      <MenuLabel>
        Signed in as{' '}
        <span className="font-semibold text-text-primary">{account}</span>
      </MenuLabel>
      {links.map((link) => (
        <MenuLink key={link.href} href={link.href}>
          <Icon name={link.icon} className="size-4" />
          {link.label}
        </MenuLink>
      ))}
      <MenuSeparator />
      <MenuButton
        tone="danger"
        disabled={pending}
        onSelect={() => startTransition(() => signOutAction())}
      >
        <Icon name="logOut" className="size-4" />
        {pending ? 'Signing out…' : 'Sign out'}
      </MenuButton>
    </Menu>
  );
}
