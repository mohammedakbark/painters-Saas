import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand/brand-mark';
import { revealIndex } from '@/components/marketing/section';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardLink } from '@/components/ui/card';
import { Icon, IconTile } from '@/components/ui/icon';
import { SubmitButton } from '@/components/ui/submit-button';
import type { Me } from '@/lib/api/me';
import { BRAND } from '@/lib/brand';
import {
  shopRoleLabel,
  shopStatusLabel,
  type ShopRole,
  type ShopStatus,
} from '@/lib/shops/labels';

export type ShopMembership = Me['shopMemberships'][number];

const NEW_SHOP_PATH = '/shops/new';

// The way a new shop goes live (WEB-002, PLT-002): a private draft until the
// profile is complete and the platform team approves it.
const GETTING_STARTED = [
  {
    icon: 'store',
    title: 'Register your shop',
    text: 'Your shop name and your name.',
  },
  {
    icon: 'notebook',
    title: 'Complete the profile',
    text: 'Photo, support mobile, address and map location.',
  },
  {
    icon: 'shield',
    title: 'Platform team approval',
    text: 'Then customers and painters can find you.',
  },
] as const;

/**
 * "Your shops" (WEB-003): the first screen after sign-in. Data comes from the
 * page (server-verified memberships); this only renders it.
 */
export function MyShopsView({
  account,
  memberships,
  signOutAction,
}: {
  account: string;
  memberships: readonly ShopMembership[];
  signOutAction: () => Promise<void>;
}) {
  const hasShops = memberships.length > 0;
  return (
    <MyShopsFrame
      account={account}
      signOutAction={signOutAction}
      action={hasShops ? <RegisterButton onDark /> : null}
    >
      {hasShops ? <ShopGrid memberships={memberships} /> : <GettingStarted />}
    </MyShopsFrame>
  );
}

/** Top bar, welcome band and footer around the page content. */
export function MyShopsFrame({
  account,
  signOutAction,
  action,
  children,
}: {
  account?: string;
  signOutAction?: () => Promise<void>;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle">
      <header className="border-b border-border-default bg-surface-default">
        <div className="mx-auto flex w-full max-w-page items-center justify-between gap-4 px-4 py-3 medium:px-6">
          <Link
            href="/"
            className="rounded-nav-item focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <BrandMark as="span" />
            <span className="sr-only">: back to the home page</span>
          </Link>
          {signOutAction ? (
            <form action={signOutAction}>
              <SubmitButton variant="secondary" pendingLabel="Signing out…">
                Sign out
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-linear-to-br from-brand-primary to-brand-primary-strong text-surface-default">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute -top-24 -right-16 size-72 rounded-badge bg-brand-accent/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 size-72 rounded-badge bg-brand-highlight/15 blur-3xl" />
        </div>
        <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 py-10 medium:flex-row medium:items-end medium:justify-between medium:px-6 medium:py-14">
          <div className="flex flex-col gap-2">
            <p className="text-caption font-semibold tracking-wide text-brand-accent uppercase">
              Shop Admin
            </p>
            <h1 className="text-display leading-tight font-bold tracking-tight">
              Your shops
            </h1>
            {account ? (
              <p className="text-body-large text-brand-primary-soft">
                Signed in as {account}.
              </p>
            ) : null}
          </div>
          {action}
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-6 px-4 py-8 medium:px-6 medium:py-10">
        {children}
      </main>

      <footer className="flex items-center justify-center gap-3 px-4 py-6 text-body font-semibold text-text-secondary">
        Powered by
        <Image
          src="/brand/zerobyt-logo-dark.png"
          alt={BRAND.companyName}
          width={936}
          height={233}
          className="h-5 w-auto"
        />
      </footer>
    </div>
  );
}

function RegisterButton({ onDark = false }: { onDark?: boolean }) {
  return (
    <ButtonLink
      href={NEW_SHOP_PATH}
      variant={onDark ? 'secondary' : 'primary'}
      className={
        onDark ? 'group shadow-lg shadow-brand-primary-strong/40' : 'group'
      }
    >
      Register a shop
      <Icon
        name="arrowRight"
        className="transition-transform group-hover:translate-x-1"
      />
    </ButtonLink>
  );
}

function ShopGrid({ memberships }: { memberships: readonly ShopMembership[] }) {
  return (
    <ul className="grid gap-4 medium:grid-cols-2">
      {memberships.map((membership, index) => (
        <li
          key={membership.shopId}
          className="reveal"
          style={revealIndex(index)}
        >
          <ShopCard
            id={membership.shopId}
            name={membership.shopName}
            role={membership.role}
            status={membership.shopStatus}
          />
        </li>
      ))}
      <li className="reveal" style={revealIndex(memberships.length)}>
        <CardLink
          href={NEW_SHOP_PATH}
          variant="dashed"
          className="flex h-full min-h-40 flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <span className="flex size-11 items-center justify-center rounded-badge bg-brand-primary-soft text-brand-primary">
            <Icon name="store" className="size-6" />
          </span>
          <span className="text-title font-semibold text-text-primary">
            Register another shop
          </span>
          <span className="text-body text-text-secondary">
            Each shop has its own catalogue, prices and customers.
          </span>
        </CardLink>
      </li>
    </ul>
  );
}

function ShopCard({
  id,
  name,
  role,
  status,
}: {
  id: string;
  name: string;
  role: ShopRole;
  status: ShopStatus;
}) {
  const label = shopStatusLabel(status);
  return (
    <CardLink
      href={`/shops/${id}`}
      variant="raised"
      className="flex h-full flex-col gap-4 p-6"
    >
      <span className="flex items-start justify-between gap-3">
        <IconTile name="store" />
        <Badge tone={label.tone}>{label.label}</Badge>
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-heading3 font-semibold text-text-primary">
          {name}
        </span>
        <span className="text-body text-text-secondary">
          {shopRoleLabel(role)}
        </span>
      </span>
      <span className="text-body text-text-secondary">{label.description}</span>
      <span className="mt-auto flex items-center gap-2 text-body font-semibold text-brand-primary">
        Open shop
        <Icon
          name="arrowRight"
          className="size-4 transition-transform duration-300 group-hover:translate-x-1"
        />
      </span>
    </CardLink>
  );
}

function GettingStarted() {
  return (
    <Card
      as="section"
      aria-labelledby="no-shop-title"
      className="reveal mx-auto flex w-full max-w-content flex-col items-center gap-6 px-6 py-10 text-center shadow-xl shadow-brand-primary/5 medium:px-10"
    >
      <IconTile name="store" />
      <div className="flex flex-col gap-2">
        <h2
          id="no-shop-title"
          className="text-heading2 font-bold tracking-tight text-text-primary"
        >
          You haven&apos;t registered a shop yet
        </h2>
        <p className="text-body-large text-text-secondary">
          Register your paint shop to start setting up your storefront. It stays
          private until the platform team approves it.
        </p>
      </div>
      <ol
        aria-label="How a shop goes live"
        className="grid w-full gap-4 text-left medium:grid-cols-3"
      >
        {GETTING_STARTED.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-2 rounded-panel bg-surface-subtle p-4"
          >
            <span className="flex items-center gap-2 text-body font-semibold text-text-primary">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-badge bg-brand-accent text-caption font-bold">
                {index + 1}
              </span>
              {step.title}
            </span>
            <span className="text-body text-text-secondary">{step.text}</span>
          </li>
        ))}
      </ol>
      <RegisterButton />
    </Card>
  );
}

/** Placeholder cards while the memberships load. */
export function MyShopsLoading() {
  return (
    <MyShopsFrame>
      <div aria-busy="true" className="grid gap-4 medium:grid-cols-2">
        <span className="sr-only">Loading your shops…</span>
        {[0, 1].map((key) => (
          <Card
            key={key}
            aria-hidden="true"
            className="flex animate-pulse flex-col gap-4 p-6"
          >
            <span className="size-11 rounded-panel bg-surface-subtle" />
            <span className="h-6 w-1/2 rounded-badge bg-surface-subtle" />
            <span className="h-4 w-3/4 rounded-badge bg-surface-subtle" />
          </Card>
        ))}
      </div>
    </MyShopsFrame>
  );
}
