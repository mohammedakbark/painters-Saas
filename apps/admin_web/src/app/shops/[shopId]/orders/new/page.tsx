import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/layout/page-loading';
import { NewOrderForm } from '@/components/orders/new-order-form';
import { PageHeader } from '@/components/ui/page-header';
import { getShopSettings } from '@/lib/api/shop-settings';
import { requireShopAccess, requireShopSession } from '@/lib/auth/shop-access';
import { text } from '@/lib/list-params';
import { ordersBase } from '@/lib/orders/labels';
import {
  createCustomerAction,
  loadOrderCustomerAction,
  recordOrderAction,
  searchCustomersAction,
} from '../../customers/actions';
import { searchPacksAction } from '../actions';

export const metadata: Metadata = { title: 'New order' };

type Props = PageProps<'/shops/[shopId]/orders/new'>;

/**
 * Record an order for a customer who doesn't use the app: by phone or at
 * the counter (ORD-004, D-054, D-055). A full page because it holds a list
 * of items (D-051).
 */
export default function NewOrderPage(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<PageLoading label="Loading…" />}>
        <NewOrder {...props} />
      </Suspense>
    </div>
  );
}

async function NewOrder({ params, searchParams }: Props) {
  const { shopId } = await params;
  const shop = await requireShopAccess(shopId);
  const token = await requireShopSession();
  const customerId = text((await searchParams).customer);
  const [settings, initialCustomer] = await Promise.all([
    getShopSettings(token, shopId),
    customerId ? loadOrderCustomerAction(shopId, customerId) : null,
  ]);

  return (
    <>
      <PageHeader
        back={{ href: ordersBase(shopId), label: 'Orders' }}
        title="New order"
        description="For orders by phone or at the counter. Only your shop sees this customer and order."
      />
      <NewOrderForm
        shopId={shopId}
        initialCustomer={initialCustomer}
        isOwner={shop.myRole === 'MASTER'}
        deliveryEnabled={settings.delivery.enabled}
        searchCustomers={searchCustomersAction.bind(null, shopId)}
        loadCustomer={loadOrderCustomerAction.bind(null, shopId)}
        searchPacks={searchPacksAction.bind(null, shopId)}
        addCustomerAction={createCustomerAction.bind(null, shopId)}
        record={recordOrderAction.bind(null, shopId)}
      />
    </>
  );
}
