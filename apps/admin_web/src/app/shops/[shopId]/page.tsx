import type { Metadata } from 'next';
import Link from 'next/link';
import { cache, Suspense } from 'react';
import { OnboardingChecklist } from '@/components/shops/onboarding-checklist';
import { ReviewPanel } from '@/components/shops/review-panel';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardList } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { SectionBoundary } from '@/components/ui/section-boundary';
import { LinesSkeleton, TilesSkeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/ui/stat-tile';
import { getShopOnboarding } from '@/lib/api/shop-profile';
import { getShopReview } from '@/lib/api/shop-review';
import { getShopSettings } from '@/lib/api/shop-settings';
import { getOrderSummary, listOrders } from '@/lib/api/orders';
import { getCatalogueSummary } from '@/lib/api/shop-summary';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { countLabel } from '@/lib/format';
import { formatRupees } from '@/lib/money';
import {
  FULFILMENT_LABEL,
  ORDER_STATUS,
  formatOrderTime,
  orderNumber,
  ordersBase,
} from '@/lib/orders/labels';
import { DataTable } from '@/components/ui/data-table';
import { Section } from '@/components/ui/section';
import { StateMessage } from '@/components/ui/state-message';
import { shopStatusLabel } from '@/lib/shops/labels';
import { submitForReviewAction, withdrawReviewAction } from './review-actions';
import { can } from '@/lib/api/shops';

export const metadata: Metadata = { title: 'Overview' };

type Props = PageProps<'/shops/[shopId]'>;

/*
 * Overview dashboard (WEB-008, ORD-003). The heading is a static shell;
 * status, order figures, product counts and to-dos each load on their own
 * (PERF-001).
 */

const base = (shopId: string) => `/shops/${encodeURIComponent(shopId)}`;

/** Each request reads these once, whichever sections need them. */
const loadShop = cache(async (shopId: string) => {
  const [shop, token] = await Promise.all([
    requireShopAccess(shopId),
    requireShopSession(),
  ]);
  return { shop, token };
});
const loadOnboarding = cache(async (shopId: string) => {
  const { token } = await loadShop(shopId);
  return getShopOnboarding(token, shopId);
});
const loadOrders = cache(async (shopId: string) => {
  const { token } = await loadShop(shopId);
  return getOrderSummary(token, shopId);
});
const loadSettings = cache(async (shopId: string) => {
  const { token } = await loadShop(shopId);
  return getShopSettings(token, shopId);
});
const loadSummary = cache(async (shopId: string) => {
  const { token } = await loadShop(shopId);
  return getCatalogueSummary(token, shopId);
});

export default function ShopOverviewPage(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title="Your shop at a glance"
        description="Status, orders, products and anything that needs your attention."
        actions={
          <Suspense fallback={null}>
            <HeaderActions {...props} />
          </Suspense>
        }
      />
      <SectionBoundary what="the shop status">
        <Suspense fallback={null}>
          <Status {...props} />
        </Suspense>
      </SectionBoundary>
      <section aria-labelledby="orders-heading" className="flex flex-col gap-3">
        <h2 id="orders-heading" className="sr-only">
          Orders
        </h2>
        <SectionBoundary what="order figures">
          <Suspense fallback={<TilesSkeleton label="Loading orders…" />}>
            <OrderTiles {...props} />
          </Suspense>
        </SectionBoundary>
      </section>
      <div className="grid items-start gap-6 wide:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <SectionBoundary what="the latest orders">
          <Suspense fallback={<CardSkeleton label="Loading orders…" />}>
            <LatestOrders {...props} />
          </Suspense>
        </SectionBoundary>
        <div className="flex flex-col gap-6">
          <SectionBoundary what="your to-dos">
            <Suspense fallback={<CardSkeleton label="Loading to-dos…" />}>
              <ToDos {...props} />
            </Suspense>
          </SectionBoundary>
          <SectionBoundary what="delivery details">
            <Suspense fallback={<CardSkeleton label="Loading delivery…" />}>
              <PickupAndDelivery {...props} />
            </Suspense>
          </SectionBoundary>
        </div>
      </div>
      <section
        aria-labelledby="products-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="products-heading" className="text-title font-semibold">
          Products
        </h2>
        <SectionBoundary what="product figures">
          <Suspense fallback={<TilesSkeleton label="Loading products…" />}>
            <ProductTiles {...props} />
          </Suspense>
        </SectionBoundary>
      </section>
    </div>
  );
}

/** A card-shaped placeholder for one Overview section. */
function CardSkeleton({ label }: { label: string }) {
  return (
    <Card className="p-5 medium:p-6">
      <LinesSkeleton label={label} />
    </Card>
  );
}

async function Status({ params, searchParams }: Props) {
  const { shopId } = await params;
  const { shop, token } = await loadShop(shopId);
  const review = await getShopReview(token, shopId);
  const status = shopStatusLabel(review.status);
  const justRegistered = (await searchParams).registered === '1';
  const live = review.status === 'ACTIVE';
  // A live shop shows its status in the sidebar; the card is for the way there.
  if (live && !justRegistered) return null;

  return (
    <>
      {justRegistered ? (
        <Alert tone="success" title="Shop registered">
          {shop.name} is registered and you are its owner.
        </Alert>
      ) : null}
      <Card
        as="section"
        aria-labelledby="status-heading"
        className="flex flex-col gap-4 p-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="status-heading" className="text-heading3 font-semibold">
            {shop.name}
          </h2>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="text-body-large text-text-secondary">
          {status.description}
        </p>
        {live ? null : (
          <ReviewPanel
            review={review}
            canEdit={can(shop, 'shop.profile')}
            submitAction={submitForReviewAction.bind(null, shop.id)}
            withdrawAction={withdrawReviewAction.bind(null, shop.id)}
          />
        )}
      </Card>
    </>
  );
}

async function OrderTiles({ params }: Props) {
  const { shopId } = await params;
  const orders = await loadOrders(shopId);
  const list = ordersBase(shopId);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4 wide:grid-cols-4">
        <StatTile
          lead
          label="New orders"
          value={orders.new}
          status={
            orders.new > 0
              ? { tone: 'info', label: 'Needs attention' }
              : undefined
          }
          href={`${list}?status=NEW`}
        />
        <StatTile
          label="To pack"
          value={orders.packing}
          href={`${list}?status=PACKING`}
        />
        <StatTile
          label="Ready or on the way"
          value={orders.ready}
          href={`${list}?status=ready`}
        />
        {orders.today.salesPaise === null ? null : (
          <StatTile
            label="Today’s sales"
            value={formatRupees(orders.today.salesPaise)}
            context={`${countLabel(orders.today.completed, 'order')} completed today`}
            href={`${list}?status=COMPLETED`}
          />
        )}
      </div>
      {orders.unpaid.count > 0 ? (
        <p className="text-body text-text-secondary">
          {orders.unpaid.totalPaise === null
            ? `${countLabel(orders.unpaid.count, 'order')} not yet paid.`
            : `${formatRupees(orders.unpaid.totalPaise)} not yet paid on ${countLabel(orders.unpaid.count, 'order')}.`}{' '}
          <Link
            href={`${list}?status=all&payment=UNPAID`}
            className="rounded-nav-item font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            See unpaid orders
          </Link>
        </p>
      ) : null}
    </div>
  );
}

async function ProductTiles({ params }: Props) {
  const { shopId } = await params;
  const { products } = await loadSummary(shopId);
  const list = `${base(shopId)}/catalogue`;

  return (
    <div className="grid gap-4 grid-cols-2 wide:grid-cols-4">
      <StatTile
        label="On sale"
        value={products.active}
        context={
          products.archived > 0 ? `${products.archived} archived` : undefined
        }
        href={list}
      />
      <StatTile
        label="All sizes available"
        value={products.allAvailable}
        href={`${list}?show=available`}
      />
      <StatTile
        label="Some sizes not available"
        value={products.partlyAvailable}
        status={
          products.partlyAvailable > 0
            ? { tone: 'info', label: 'Check' }
            : undefined
        }
        href={`${list}?show=partly`}
      />
      <StatTile
        label="Not available"
        value={products.noneAvailable}
        status={
          products.noneAvailable > 0
            ? { tone: 'warning', label: 'Customers can’t order' }
            : undefined
        }
        href={`${list}?show=none`}
      />
    </div>
  );
}

/** The page's main actions, by permission (D-056). */
async function HeaderActions({ params }: Props) {
  const { shopId } = await params;
  const { shop } = await loadShop(shopId);
  return (
    <>
      {can(shop, 'orders.record') ? (
        <ButtonLink href={`${ordersBase(shopId)}/new`} variant="secondary">
          Record an order
        </ButtonLink>
      ) : null}
      {can(shop, 'catalogue.manage') ? (
        <ButtonLink href={`${base(shopId)}/catalogue/add`}>
          <Icon name="plus" className="size-5" />
          Add product
        </ButtonLink>
      ) : null}
    </>
  );
}

/** The five most recent orders, each opening its order page. */
async function LatestOrders({ params }: Props) {
  const { shopId } = await params;
  const { shop, token } = await loadShop(shopId);
  if (!can(shop, 'orders.handle')) return null;
  // The API pages by 10, 25 or 50; the Overview shows the first five.
  const items = (
    await listOrders(token, shopId, { status: 'all', page: 1, pageSize: 10 })
  ).items.slice(0, 5);
  const list = ordersBase(shopId);

  return (
    <Section
      title="Latest orders"
      actions={
        <Link
          href={`${list}?status=all`}
          className="rounded-nav-item text-body font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          All orders
        </Link>
      }
    >
      <DataTable
        caption="Latest orders"
        columns={[
          {
            key: 'order',
            header: 'Order',
            width: 'w-36',
            cell: (row) => (
              <div className="flex flex-col items-end gap-0.5 desktop:items-start">
                <Link
                  href={`${list}/${row.id}`}
                  className="w-fit rounded-nav-item font-semibold text-brand-primary tabular-nums underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
                >
                  {orderNumber(row.number)}
                </Link>
                <span className="text-caption whitespace-nowrap text-text-secondary">
                  {formatOrderTime(row.placedAt)}
                </span>
              </div>
            ),
          },
          {
            key: 'customer',
            header: 'Customer',
            cell: (row) => (
              <div className="flex min-w-0 flex-col items-end gap-0.5 desktop:items-start">
                <span className="font-semibold">{row.customer.name}</span>
                <span className="text-caption text-text-secondary">
                  {row.siteLabel ?? FULFILMENT_LABEL[row.fulfilment]}
                </span>
              </div>
            ),
          },
          {
            key: 'step',
            header: 'Step',
            width: 'w-44',
            cell: (row) => (
              <Badge tone={ORDER_STATUS[row.status].tone}>
                {ORDER_STATUS[row.status].label}
              </Badge>
            ),
          },
          {
            key: 'total',
            header: 'Total',
            align: 'end',
            width: 'w-28',
            cell: (row) => (
              <span className="font-semibold tabular-nums">
                {formatRupees(row.totalPaise)}
              </span>
            ),
          },
        ]}
        rows={items}
        rowKey={(row) => row.id}
        empty={
          <StateMessage
            variant="plain"
            icon="receipt"
            title="No orders yet"
            description="Orders from the app and the ones you record show here."
          />
        }
      />
    </Section>
  );
}

interface ToDo {
  icon: IconName;
  text: string;
  href: string;
  action: string;
}

async function ToDos({ params }: Props) {
  const { shopId } = await params;
  const { shop } = await loadShop(shopId);
  const [onboarding, summary, settings, orders] = await Promise.all([
    loadOnboarding(shopId),
    loadSummary(shopId),
    loadSettings(shopId),
    loadOrders(shopId),
  ]);
  const setupDone = onboarding.items.every((item) => item.done);

  // Setup comes first: until it is done the checklist is the to-do list.
  if (!setupDone || shop.status !== 'ACTIVE') {
    return <OnboardingChecklist shopId={shop.id} onboarding={onboarding} />;
  }

  const todos: ToDo[] = [];
  if (orders.new > 0) {
    todos.push({
      icon: 'receipt',
      text: `${orders.new} new ${orders.new === 1 ? 'order is' : 'orders are'} waiting.`,
      href: `${ordersBase(shopId)}?status=NEW`,
      action: 'Open orders',
    });
  }
  const { products } = summary;
  if (products.noneAvailable > 0) {
    todos.push({
      icon: 'tag',
      text: `${products.noneAvailable} ${products.noneAvailable === 1 ? 'product has' : 'products have'} no size available.`,
      href: `${base(shopId)}/catalogue?show=none`,
      action: 'Review',
    });
  }
  if (products.ownWithoutPhoto > 0) {
    todos.push({
      icon: 'tag',
      text: `${products.ownWithoutPhoto} of your own ${products.ownWithoutPhoto === 1 ? 'product has' : 'products have'} no photo.`,
      href: `${base(shopId)}/catalogue`,
      action: 'Add photos',
    });
  }
  if (!settings.delivery.enabled) {
    todos.push({
      icon: 'store',
      text: 'Delivery is off. Customers can only pick up their orders.',
      href: `${base(shopId)}/settings`,
      action: 'Set up delivery',
    });
  }

  return (
    <section aria-labelledby="todo-heading" className="flex flex-col gap-3">
      <h2 id="todo-heading" className="text-heading3 font-semibold">
        To do
      </h2>
      {todos.length === 0 ? (
        <Card className="flex items-center gap-3 p-5">
          <Icon name="check" className="size-5 text-status-success" />
          <span className="text-body-large">
            Nothing needs your attention right now.
          </span>
        </Card>
      ) : (
        <CardList className="px-5">
          {todos.map((todo) => (
            <li
              key={todo.text}
              className="flex flex-col gap-2 py-4 medium:flex-row medium:items-center medium:justify-between"
            >
              <span className="flex items-start gap-3">
                <Icon
                  name={todo.icon}
                  className="mt-0.5 size-5 shrink-0 text-text-secondary"
                />
                <span className="text-body-large">{todo.text}</span>
              </span>
              <Link
                href={todo.href}
                className="shrink-0 rounded-nav-item font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
              >
                {todo.action}
              </Link>
            </li>
          ))}
        </CardList>
      )}
    </section>
  );
}

async function PickupAndDelivery({ params }: Props) {
  const { shopId } = await params;
  const [settings, summary] = await Promise.all([
    loadSettings(shopId),
    loadSummary(shopId),
  ]);
  const { delivery } = settings;

  return (
    <aside className="flex flex-col gap-6">
      <Card
        as="section"
        aria-labelledby="delivery-heading"
        className="flex flex-col gap-3 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="delivery-heading" className="text-title font-semibold">
            Pickup and delivery
          </h2>
          {delivery.enabled ? (
            <Badge tone="success">Delivery on</Badge>
          ) : (
            <Badge tone="neutral">Pickup only</Badge>
          )}
        </div>
        {delivery.enabled &&
        delivery.chargePaise !== null &&
        delivery.radiusKm !== null ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
            <dt className="text-text-secondary">Charge</dt>
            <dd className="font-semibold">
              {delivery.chargePaise === 0
                ? 'Free'
                : formatRupees(delivery.chargePaise)}
            </dd>
            {delivery.freeAbovePaise !== null ? (
              <>
                <dt className="text-text-secondary">Free from</dt>
                <dd className="font-semibold">
                  {formatRupees(delivery.freeAbovePaise)}
                </dd>
              </>
            ) : null}
            <dt className="text-text-secondary">Distance</dt>
            <dd className="font-semibold">Up to {delivery.radiusKm} km</dd>
          </dl>
        ) : (
          <p className="text-body text-text-secondary">
            Customers pick up their orders at the shop.
          </p>
        )}
        <div>
          <ButtonLink href={`${base(shopId)}/settings`} variant="secondary">
            Shop settings
          </ButtonLink>
        </div>
      </Card>
      <Card
        as="section"
        aria-labelledby="shades-heading"
        className="flex flex-col gap-3 p-5"
      >
        <h2 id="shades-heading" className="text-title font-semibold">
          Shades and categories
        </h2>
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-body">
          <dt className="text-text-secondary">Favourite shades</dt>
          <dd className="font-semibold tabular-nums">
            {summary.shades.favourites}
          </dd>
          <dt className="text-text-secondary">My shades</dt>
          <dd className="font-semibold tabular-nums">{summary.shades.own}</dd>
          <dt className="text-text-secondary">Your own categories</dt>
          <dd className="font-semibold tabular-nums">
            {summary.ownCategories}
          </dd>
        </dl>
        <div className="flex flex-wrap gap-5">
          <Link
            href={`${base(shopId)}/catalogue/shades`}
            className="rounded-nav-item font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            Shades
          </Link>
          <Link
            href={`${base(shopId)}/categories`}
            className="rounded-nav-item font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            Categories
          </Link>
        </div>
      </Card>
    </aside>
  );
}
