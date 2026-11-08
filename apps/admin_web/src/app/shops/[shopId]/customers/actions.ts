'use server';

import { refresh } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import type { ComboboxOption } from '@/components/ui/combobox';
import {
  createCustomer,
  createSite,
  type CustomerKind,
  getCustomer,
  listCustomers,
  type SiteBody,
  updateCustomer,
  updateSite,
} from '@/lib/api/customers';
import { recordOrder, type RecordOrderBody } from '@/lib/api/orders';
import { ApiError } from '@/lib/api/problem';
import { requireShopSession, SHOP_SIGN_IN_PATH } from '@/lib/auth/shop-access';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
  catalogueFieldErrors,
  formValues,
} from '@/lib/catalogue/form-state';
import {
  customerPath,
  KIND_LABEL,
  parseSiteForm,
} from '@/lib/customers/customer-forms';
import { ordersBase } from '@/lib/orders/labels';
import { formatIndianMobile, parseIndianMobile } from '@/lib/phone';

/*
 * Customers, sites and orders the shop records (ORD-004, D-054, D-055).
 * The ids are only a request: the API checks membership and that each
 * record belongs to this shop.
 */

function failure(
  error: unknown,
  values?: Record<string, string>,
  fields: Record<string, string> = {},
): CatalogueFormState {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      redirect(SHOP_SIGN_IN_PATH);
    }
    if (error.code === 'shop_not_found') {
      notFound();
    }
    const errors = error.problem?.errors ?? [];
    if (errors.length > 0 && error.status === 400) {
      const fieldErrors: Record<string, string> = {};
      for (const [path, message] of Object.entries(
        catalogueFieldErrors(errors),
      )) {
        fieldErrors[fields[path] ?? path] = message;
      }
      return { values, fieldErrors };
    }
    if (error.problem?.detail && [400, 403, 404, 409].includes(error.status)) {
      return { values, error: error.problem.detail };
    }
  }
  return { values, error: CATALOGUE_MESSAGES.unavailable };
}

function readCustomer(values: Record<string, string>) {
  const fieldErrors: Record<string, string> = {};
  const name = values.name.trim();
  if (!name) fieldErrors.name = 'Enter the name.';
  else if (name.length > 120)
    fieldErrors.name = 'The name can be at most 120 characters.';
  const phone = parseIndianMobile(values.phone);
  if (!phone) fieldErrors.phone = 'Enter a 10-digit Indian mobile number.';
  const kind = values.kind in KIND_LABEL ? (values.kind as CustomerKind) : null;
  if (!kind) fieldErrors.kind = 'Choose Painter or Customer.';
  return { name, phone, kind, fieldErrors };
}

/** A customer chosen for a new order, with their active sites. */
export interface OrderCustomer {
  id: string;
  name: string;
  phone: string;
  kind: CustomerKind;
  hasApp: boolean;
  sites: { id: string; name: string; address: string }[];
}

export type CustomerFormState = CatalogueFormState & {
  /** The customer just added, for forms that pick it straight away. */
  created?: OrderCustomer;
};

export async function createCustomerAction(
  shopId: string,
  _previous: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const values = formValues(formData, ['name', 'phone', 'kind']);
  const { name, phone, kind, fieldErrors } = readCustomer(values);
  if (!phone || !kind || Object.keys(fieldErrors).length > 0) {
    return { values, fieldErrors };
  }
  const token = await requireShopSession();
  try {
    const created = await createCustomer(token, shopId, { name, phone, kind });
    refresh();
    return {
      saved: `${created.name} added.`,
      savedLink: { href: customerPath(shopId, created.id), label: 'Open' },
      created: {
        id: created.id,
        name: created.name,
        phone: created.phone,
        kind: created.kind,
        hasApp: created.hasApp,
        sites: [],
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.code === 'customer_phone_taken') {
      const found = await listCustomers(token, shopId, {
        q: phone.slice(3),
        page: 1,
        pageSize: 10,
      }).catch(() => null);
      const existing = found?.items.find(
        (item) => item.phone === phone && !item.hasApp,
      );
      return {
        values,
        fieldErrors: {
          phone: existing
            ? `${formatIndianMobile(phone)} is already in your customers as ${existing.name}.`
            : 'This mobile number is already in your customers.',
        },
      };
    }
    return failure(error, values);
  }
}

export async function updateCustomerAction(
  shopId: string,
  customerId: string,
  hasApp: boolean,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const values = formValues(formData, ['name', 'phone', 'kind']);
  const read = readCustomer(
    hasApp ? { ...values, phone: '9000000000' } : values,
  );
  if (!read.kind || Object.keys(read.fieldErrors).length > 0) {
    return { values, fieldErrors: read.fieldErrors };
  }
  try {
    await updateCustomer(await requireShopSession(), shopId, customerId, {
      name: read.name,
      kind: read.kind,
      ...(hasApp || !read.phone ? {} : { phone: read.phone }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'customer_phone_taken') {
      return {
        values,
        fieldErrors: {
          phone: 'This mobile number is already in your customers.',
        },
      };
    }
    return failure(error, values);
  }
  refresh();
  return { saved: 'Customer saved.' };
}

export async function saveSiteAction(
  shopId: string,
  customerId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  // Empty for a new site. The API checks the site belongs to this customer.
  const siteId = String(formData.get('siteId') ?? '') || null;
  const values = formValues(formData, [
    'name',
    'ownerName',
    'address',
    'latitude',
    'longitude',
  ]);
  const parsed = parseSiteForm(values);
  if (!parsed.ok) {
    return { values, fieldErrors: parsed.fieldErrors };
  }
  const token = await requireShopSession();
  try {
    if (siteId) {
      await updateSite(token, shopId, customerId, siteId, parsed.body);
    } else {
      await createSite(token, shopId, customerId, parsed.body);
    }
  } catch (error) {
    return failure(error, values, { pin: 'latitude' });
  }
  refresh();
  return { saved: siteId ? 'Site saved.' : `${parsed.body.name} added.` };
}

export async function setSiteArchivedAction(
  shopId: string,
  customerId: string,
  siteId: string,
  archived: boolean,
): Promise<CatalogueFormState> {
  const body: SiteBody = { archived };
  try {
    await updateSite(
      await requireShopSession(),
      shopId,
      customerId,
      siteId,
      body,
    );
  } catch (error) {
    return failure(error);
  }
  refresh();
  return { saved: archived ? 'Site archived.' : 'Site restored.' };
}

/** Customers for the new-order search: name or mobile. */
export async function searchCustomersAction(
  shopId: string,
  text: string,
): Promise<ComboboxOption[]> {
  const q = text.trim().slice(0, 60);
  if (q.length < 2) {
    return [];
  }
  try {
    const page = await listCustomers(await requireShopSession(), shopId, {
      q,
      page: 1,
      pageSize: 10,
    });
    return page.items.map((item) => ({
      id: item.id,
      title: item.name,
      detail: `${formatIndianMobile(item.phone)} · ${KIND_LABEL[item.kind]}${item.hasApp ? ' · uses the app' : ''}`,
    }));
  } catch {
    return [];
  }
}

/** The customer and active sites for the new-order form. */
export async function loadOrderCustomerAction(
  shopId: string,
  customerId: string,
): Promise<OrderCustomer | null> {
  try {
    const customer = await getCustomer(
      await requireShopSession(),
      shopId,
      customerId,
    );
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      kind: customer.kind,
      hasApp: customer.hasApp,
      sites: customer.sites
        .filter((site) => !site.archived)
        .map((site) => ({
          id: site.id,
          name: site.name,
          address: site.address,
        })),
    };
  } catch {
    return null;
  }
}

export interface RecordOrderState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Saves an order the shop records, then opens it. */
export async function recordOrderAction(
  shopId: string,
  body: RecordOrderBody,
): Promise<RecordOrderState> {
  let orderId: string;
  try {
    const order = await recordOrder(await requireShopSession(), shopId, body);
    orderId = order.id;
  } catch (error) {
    const state = failure(error);
    return { error: state.error, fieldErrors: state.fieldErrors };
  }
  refresh();
  redirect(`${ordersBase(shopId)}/${orderId}?recorded=1`);
}
