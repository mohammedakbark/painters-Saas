'use client';

import { type ReactNode, useSyncExternalStore, useTransition } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { LogoMark } from '@/components/brand/logo-mark';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { ToastHost } from '@/components/ui/toast';
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
      <aside className="hidden bg-sidebar-background text-sidebar-foreground desktop:sticky desktop:top-0 desktop:flex desktop:h-dvh desktop:flex-col">
        <div
          className={cn(
            'flex items-center pt-5 pb-4',
            collapsed ? 'justify-center px-2' : 'px-5',
          )}
        >
          {collapsed ? (
            <LogoMark tone="inverse" className="h-6" />
          ) : (
            <BrandMark tone="inverse" />
          )}
        </div>
        <div className={cn('mb-4', collapsed ? 'px-2' : 'px-3')}>
          <AreaSwitcher area={area} collapsed={collapsed} inverse />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
          <NavLinks items={nav} orientation="vertical" collapsed={collapsed} />
        </div>
        <div className={cn('flex', collapsed ? 'justify-center px-2' : 'px-3')}>
          <IconButton
            tone="inverse"
            icon="panelLeft"
            label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
            aria-expanded={!collapsed}
            onClick={toggle}
          />
        </div>
        <div
          className={cn(
            'border-t border-sidebar-foreground/15',
            collapsed ? 'p-2' : 'p-3',
          )}
        >
          <AccountMenu
            account={account}
            links={accountLinks}
            signOutAction={signOutAction}
            collapsed={collapsed}
            side="top"
            inverse
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
        {/* PageHeader is the white page bar at the top of main (UI-101). */}
        <main className="flex w-full flex-1 flex-col gap-6 px-4 pb-10 medium:px-6">
          {children}
        </main>
      </div>
      {/* Page-level toasts for actions anywhere in the console (UX-001). */}
      <ToastHost />
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
  /** `accent`: sunflower, for the person on the sidebar. */
  tone: 'brand' | 'soft' | 'accent';
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-badge text-body font-bold',
        tone === 'brand' && 'bg-brand-primary text-surface-default',
        tone === 'soft' && 'bg-brand-primary-soft text-brand-primary',
        tone === 'accent' && 'bg-sidebar-count text-sidebar-count-foreground',
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
  inverse = false,
}: {
  area: ShellArea;
  collapsed: boolean;
  /** On the deep-teal sidebar: a translucent card with white text. */
  inverse?: boolean;
}) {
  const surface = inverse
    ? 'border border-sidebar-foreground/15 bg-sidebar-foreground/10'
    : 'bg-surface-subtle';
  const summary = (
    <span className="flex w-full min-w-0 items-center gap-3 text-left">
      <Avatar tone={inverse ? 'accent' : 'brand'}>{initial(area.name)}</Avatar>
      {collapsed ? null : (
        <>
          <span className="flex min-w-0 flex-1 flex-col">
            <span
              className={cn(
                'text-caption font-semibold tracking-wide uppercase',
                inverse ? 'text-sidebar-muted' : 'text-text-secondary',
              )}
            >
              {area.caption}
            </span>
            <span
              className={cn(
                'truncate text-body font-semibold',
                inverse ? 'text-sidebar-foreground' : 'text-text-primary',
              )}
            >
              {area.name}
            </span>
          </span>
          {area.switcher ? (
            <Icon
              name="chevronsUpDown"
              className={cn(
                'size-4',
                inverse ? 'text-sidebar-muted' : 'text-text-secondary',
              )}
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
          'rounded-panel',
          surface,
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
      inverse={inverse}
      triggerClassName={cn(
        'w-full rounded-panel',
        surface,
        inverse
          ? 'hover:bg-sidebar-foreground/15'
          : 'hover:bg-brand-primary-soft',
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
  inverse = false,
}: {
  account: string;
  links: readonly ShellLink[];
  signOutAction: () => Promise<void>;
  collapsed: boolean;
  side: 'top' | 'bottom';
  /** On the deep-teal sidebar. */
  inverse?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Menu
      label={`Account: ${account}`}
      align={side === 'top' ? 'start' : 'end'}
      side={side}
      className={side === 'top' ? 'w-full' : undefined}
      inverse={inverse}
      triggerClassName={cn(
        inverse ? 'hover:bg-sidebar-foreground/10' : 'hover:bg-surface-subtle',
        side === 'top' ? 'w-full px-2 py-2' : 'px-1',
        collapsed && side === 'top' && 'justify-center px-0',
      )}
      trigger={
        <span className="flex min-w-0 items-center gap-3 text-left">
          <Avatar tone={inverse ? 'accent' : 'soft'}>
            <Icon name="user" className="size-5" />
          </Avatar>
          {collapsed ? null : (
            <span className="flex min-w-0 flex-col">
              <span
                className={cn(
                  'text-caption',
                  inverse ? 'text-sidebar-muted' : 'text-text-secondary',
                )}
              >
                Signed in as
              </span>
              <span
                className={cn(
                  'truncate text-body font-medium',
                  inverse ? 'text-sidebar-foreground' : 'text-text-primary',
                )}
              >
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
