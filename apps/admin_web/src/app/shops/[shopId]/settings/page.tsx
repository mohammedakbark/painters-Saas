import type { Metadata } from 'next';
import { cache, Suspense } from 'react';
import { ActionButtonForm } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button-link';
import { Card, CardList } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SectionLoading } from '@/components/ui/section-loading';
import { SideSheet, SideSheetButton } from '@/components/ui/side-sheet';
import { StateMessage } from '@/components/ui/state-message';
import { getShopSettings, type ShopSettings } from '@/lib/api/shop-settings';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { MAX_ORDER_MESSAGES } from '@/lib/shops/settings';
import {
  addOrderMessageAction,
  editOrderMessageAction,
  removeOrderMessageAction,
  saveDeliveryAction,
} from './actions';
import { DeliveryForm, OrderMessageForm } from './settings-forms';

export const metadata: Metadata = { title: 'Shop settings' };

type Props = PageProps<'/shops/[shopId]/settings'>;

const ADD_MESSAGE = 'add-order-message';
const editMessage = (index: number) => `edit-order-message-${index}`;

/**
 * Shop settings (SHP-008): details, pickup and delivery (D-046, D-049) and
 * the ready-made "not available" messages (D-045). Headings are a static
 * shell; each data section loads on its own (PERF-001).
 */
export default function ShopSettingsPage(props: Props) {
  return (
    <div className="flex max-w-content flex-col gap-6">
      <PageHeader
        title="Shop settings"
        description="Your shop details, how customers get their orders, and the messages you send about items."
      />

      <Card
        as="section"
        aria-labelledby="details-heading"
        className="flex flex-col gap-3 p-6"
      >
        <h2 id="details-heading" className="text-heading3 font-semibold">
          Shop details and photo
        </h2>
        <p className="text-body text-text-secondary">
          Photo, support mobile, address and map location. Customers see these
          once your shop is live.
        </p>
        <div>
          <Suspense fallback={null}>
            <ShopDetailsLink {...props} />
          </Suspense>
        </div>
      </Card>

      <Card
        as="section"
        aria-labelledby="delivery-heading"
        className="flex flex-col gap-4 p-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="delivery-heading" className="text-heading3 font-semibold">
            Pickup and delivery
          </h2>
          <p className="text-body text-text-secondary">
            Customers can always pick up orders at the shop. Turn on delivery to
            offer it at checkout too.
          </p>
        </div>
        <Suspense fallback={<SectionLoading label="Loading delivery…" />}>
          <Delivery {...props} />
        </Suspense>
      </Card>

      <Card
        as="section"
        aria-labelledby="messages-heading"
        className="flex flex-col gap-4 p-6"
      >
        <Suspense fallback={<SectionLoading label="Loading messages…" />}>
          <OrderMessages {...props} />
        </Suspense>
      </Card>
    </div>
  );
}

async function ShopDetailsLink({ params }: Props) {
  const { shopId } = await params;
  return (
    <ButtonLink
      href={`/shops/${encodeURIComponent(shopId)}/profile`}
      variant="secondary"
    >
      Edit shop details
    </ButtonLink>
  );
}

/** Loads the settings once per request for both data sections. */
const loadSettings = cache(async (shopId: string) => {
  const shop = await requireShopAccess(shopId);
  const settings: ShopSettings = await getShopSettings(
    await requireShopSession(),
    shopId,
  );
  return { shopId, settings, canEdit: shop.myRole === 'MASTER' };
});

async function load(params: Props['params']) {
  return loadSettings((await params).shopId);
}

async function Delivery({ params }: Props) {
  const { shopId, settings, canEdit } = await load(params);
  return (
    <>
      {!settings.hasLocation ? (
        <Alert tone="info" title="Set your map location first">
          <span className="flex flex-col items-start gap-3">
            Delivery distance is measured from your shop&apos;s map location.
            <ButtonLink
              href={`/shops/${encodeURIComponent(shopId)}/profile`}
              variant="secondary"
            >
              Set the location
            </ButtonLink>
          </span>
        </Alert>
      ) : null}
      <DeliveryForm
        action={saveDeliveryAction.bind(null, shopId)}
        delivery={settings.delivery}
        canEdit={canEdit}
      />
    </>
  );
}

async function OrderMessages({ params }: Props) {
  const { shopId, settings, canEdit } = await load(params);
  const messages = settings.orderMessages;
  const full = messages.length >= MAX_ORDER_MESSAGES;

  return (
    <>
      <div className="flex flex-col gap-3 medium:flex-row medium:items-start medium:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="messages-heading" className="text-heading3 font-semibold">
            Order messages
          </h2>
          <p className="text-body text-text-secondary">
            Ready-made notes for items you can&apos;t supply. Pick one when you
            mark an item not available, or write your own. Up to{' '}
            {MAX_ORDER_MESSAGES}.
          </p>
        </div>
        {canEdit && !full ? (
          <SideSheetButton
            className="shrink-0 whitespace-nowrap"
            sheet={ADD_MESSAGE}
            icon="plus"
            variant="secondary"
          >
            Add message
          </SideSheetButton>
        ) : null}
      </div>

      {canEdit ? (
        <>
          <SideSheet id={ADD_MESSAGE} title="Add a message">
            <OrderMessageForm
              action={addOrderMessageAction.bind(null, shopId)}
              submitLabel="Add message"
            />
          </SideSheet>
          {messages.map((message, index) => (
            <SideSheet
              key={`${index}-${message}`}
              id={editMessage(index)}
              title="Edit message"
            >
              <OrderMessageForm
                action={editOrderMessageAction.bind(
                  null,
                  shopId,
                  index,
                  message,
                )}
                initial={message}
                submitLabel="Save message"
              />
            </SideSheet>
          ))}
        </>
      ) : null}

      {messages.length === 0 ? (
        <StateMessage
          icon="message"
          title="No messages yet"
          description="Add the notes you send most, for example when stock arrives tomorrow."
        />
      ) : (
        <CardList className="px-4">
          {messages.map((message, index) => (
            <li
              key={`${index}-${message}`}
              className="flex flex-col gap-2 py-3 medium:flex-row medium:items-center medium:justify-between"
            >
              <p className="text-body-large text-text-primary">{message}</p>
              {canEdit ? (
                <div className="flex shrink-0 items-start gap-1">
                  <SideSheetButton
                    sheet={editMessage(index)}
                    variant="tertiary"
                    aria-label={`Edit message: ${message}`}
                  >
                    Edit
                  </SideSheetButton>
                  <ActionButtonForm
                    action={removeOrderMessageAction.bind(
                      null,
                      shopId,
                      index,
                      message,
                    )}
                    label="Remove"
                    pendingLabel="Removing…"
                    variant="tertiary"
                    accessibleLabel={`Remove message: ${message}`}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </CardList>
      )}
    </>
  );
}
