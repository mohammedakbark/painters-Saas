'use client';

import { useCallback, useState, useTransition } from 'react';
import { CustomerForm } from '@/components/customers/customer-forms';
import type { FormAction } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroupField } from '@/components/ui/choice-group-fields';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { SelectField } from '@/components/ui/select-field';
import { openSideSheet, SideSheet } from '@/components/ui/side-sheet';
import { TextareaField } from '@/components/ui/textarea-field';
import {
  checkDraft,
  customerPath,
  type DraftLine,
  draftTotal,
  KIND_LABEL,
} from '@/lib/customers/customer-forms';
import { formatRupees } from '@/lib/money';
import { PAYMENT_METHOD_LABEL } from '@/lib/orders/labels';
import { formatIndianMobile } from '@/lib/phone';

export interface OrderCustomerChoice {
  id: string;
  name: string;
  phone: string;
  kind: 'PAINTER' | 'CUSTOMER';
  hasApp: boolean;
  sites: { id: string; name: string; address: string }[];
}

type PackOption = ComboboxOption & { pricePaise: number };
type PaymentMethod = keyof typeof PAYMENT_METHOD_LABEL;

export interface RecordOrderPayload {
  customerId: string;
  siteId?: string;
  fulfilment: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string;
  items: { shopProductPackId: string; quantity: number; shadeCode?: string }[];
  handedOver: boolean;
  paymentMethod?: PaymentMethod;
}

const ADD_CUSTOMER_SHEET = 'new-order-add-customer';

/**
 * Records an order for a customer by phone or at the counter (ORD-004,
 * D-054, D-055). Everything stays in the browser until "Save as new order"
 * or "Handed over now"; prices are the shop's current prices.
 */
export function NewOrderForm({
  shopId,
  initialCustomer,
  isOwner,
  deliveryEnabled,
  searchCustomers,
  loadCustomer,
  searchPacks,
  addCustomerAction,
  record,
}: {
  shopId: string;
  initialCustomer: OrderCustomerChoice | null;
  isOwner: boolean;
  deliveryEnabled: boolean;
  searchCustomers: (text: string) => Promise<ComboboxOption[]>;
  loadCustomer: (id: string) => Promise<OrderCustomerChoice | null>;
  searchPacks: (text: string) => Promise<PackOption[]>;
  addCustomerAction: FormAction;
  record: (
    payload: RecordOrderPayload,
  ) => Promise<
    { error?: string; fieldErrors?: Record<string, string> } | undefined
  >;
}) {
  const [customer, setCustomer] = useState(initialCustomer);
  const [siteId, setSiteId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [fulfilment, setFulfilment] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<PaymentMethod | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [savingKind, setSavingKind] = useState<'new' | 'handed' | null>(null);

  const site = customer?.sites.find((item) => item.id === siteId) ?? null;
  const total = draftTotal(lines);

  const chooseCustomer = useCallback(
    async (id: string) => {
      const loaded = await loadCustomer(id);
      if (loaded) {
        setCustomer(loaded);
        setSiteId('');
        setErrors((current) => ({ ...current, customer: '' }));
      }
    },
    [loadCustomer],
  );
  const onCreated = useCallback((created: unknown) => {
    setCustomer(created as OrderCustomerChoice);
    setSiteId('');
  }, []);

  function addLine(option: PackOption) {
    setLines((current) =>
      current.some((line) => line.packId === option.id)
        ? current.map((line) =>
            line.packId === option.id
              ? { ...line, quantity: Math.min(999, line.quantity + 1) }
              : line,
          )
        : [
            ...current,
            {
              packId: option.id,
              title: option.title,
              detail: option.detail ?? '',
              pricePaise: option.pricePaise,
              quantity: 1,
              shadeCode: '',
            },
          ],
    );
    setErrors((current) => ({ ...current, items: '' }));
  }

  function updateLine(packId: string, change: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) =>
        line.packId === packId ? { ...line, ...change } : line,
      ),
    );
  }

  function submit(handedOver: boolean) {
    const deliveryAddress =
      fulfilment === 'DELIVERY' ? address.trim() || site?.address || '' : '';
    const problems = checkDraft({
      customerId: customer?.id ?? null,
      lines,
      fulfilment,
      address: deliveryAddress,
    });
    setErrors(problems);
    setServerError(null);
    if (Object.keys(problems).length > 0 || !customer) {
      return;
    }
    setSavingKind(handedOver ? 'handed' : 'new');
    startSaving(async () => {
      const result = await record({
        customerId: customer.id,
        ...(siteId ? { siteId } : {}),
        fulfilment,
        ...(fulfilment === 'DELIVERY' && address.trim()
          ? { deliveryAddress: address.trim() }
          : {}),
        items: lines.map((line) => ({
          shopProductPackId: line.packId,
          quantity: line.quantity,
          ...(line.shadeCode.trim()
            ? { shadeCode: line.shadeCode.trim() }
            : {}),
        })),
        handedOver,
        ...(handedOver && payment ? { paymentMethod: payment } : {}),
      });
      // On success the action opens the order; only failures come back.
      if (result?.error) setServerError(result.error);
      if (result?.fieldErrors) setErrors(result.fieldErrors);
      setSavingKind(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {serverError ? (
        <Alert tone="error" title="Not saved">
          {serverError}
        </Alert>
      ) : null}

      <Card
        as="section"
        aria-labelledby="customer-step"
        className="flex flex-col gap-4 p-5 medium:p-6"
      >
        <h2 id="customer-step" className="text-heading3 font-semibold">
          1. Customer
        </h2>
        {customer ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-card-border p-4">
            <div className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <a
                  href={customerPath(shopId, customer.id)}
                  className="font-semibold text-brand-primary underline-offset-4 hover:underline"
                >
                  {customer.name}
                </a>
                <Badge tone={customer.kind === 'PAINTER' ? 'info' : 'neutral'}>
                  {KIND_LABEL[customer.kind]}
                </Badge>
              </span>
              <span className="text-body text-text-secondary tabular-nums">
                {formatIndianMobile(customer.phone)}
              </span>
            </div>
            <Button
              type="button"
              variant="tertiary"
              onClick={() => setCustomer(null)}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Combobox
              label="Find the customer"
              placeholder="Name or mobile number"
              search={searchCustomers}
              onSelect={(option) => void chooseCustomer(option.id)}
              emptyLabel="No customer matches. Add them below."
            />
            {errors.customer ? (
              <p className="text-body text-status-error">{errors.customer}</p>
            ) : null}
            <div>
              <Button
                type="button"
                variant="secondary"
                aria-haspopup="dialog"
                onClick={() => openSideSheet(ADD_CUSTOMER_SHEET)}
              >
                Add customer
              </Button>
            </div>
          </div>
        )}
        {customer?.kind === 'PAINTER' && !customer.hasApp ? (
          customer.sites.length > 0 ? (
            <SelectField
              label="Site (optional)"
              name="siteId"
              value={siteId}
              onChange={(event) => setSiteId(event.currentTarget.value)}
              options={[
                { value: '', label: 'No site' },
                ...customer.sites.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          ) : (
            <p className="text-body text-text-secondary">
              No sites yet.{' '}
              <a
                href={customerPath(shopId, customer.id)}
                className="font-semibold text-brand-primary underline-offset-4 hover:underline"
              >
                Add sites on the customer page
              </a>
              .
            </p>
          )
        ) : null}
      </Card>

      <Card
        as="section"
        aria-labelledby="items-step"
        className="flex flex-col gap-4 p-5 medium:p-6"
      >
        <h2 id="items-step" className="text-heading3 font-semibold">
          2. Items
        </h2>
        <Combobox
          label="Add a product"
          description="Search your products. Only available pack sizes are listed, at today’s price."
          placeholder="Name or brand"
          search={searchPacks}
          onSelect={(option) => addLine(option as PackOption)}
          emptyLabel="No available pack size matches."
        />
        {errors.items ? (
          <p className="text-body text-status-error">{errors.items}</p>
        ) : null}
        {lines.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border-default">
            {lines.map((line) => (
              <li
                key={line.packId}
                className="grid gap-3 py-4 medium:grid-cols-[minmax(0,1fr)_7rem_9rem_auto] medium:items-end"
              >
                <div className="flex min-w-0 flex-col gap-1 self-center">
                  <span className="font-semibold">{line.title}</span>
                  <span className="text-caption text-text-secondary">
                    {line.detail}
                  </span>
                  <span className="text-body font-semibold tabular-nums">
                    {formatRupees(
                      line.pricePaise *
                        (Number.isInteger(line.quantity) ? line.quantity : 0),
                    )}
                  </span>
                </div>
                <Field
                  label="Quantity"
                  name={`quantity-${line.packId}`}
                  inputMode="numeric"
                  value={
                    Number.isNaN(line.quantity) ? '' : String(line.quantity)
                  }
                  onChange={(event) =>
                    updateLine(line.packId, {
                      quantity:
                        event.currentTarget.value === ''
                          ? Number.NaN
                          : Number(event.currentTarget.value),
                    })
                  }
                />
                <Field
                  label="Shade code"
                  name={`shade-${line.packId}`}
                  maxLength={40}
                  value={line.shadeCode}
                  onChange={(event) =>
                    updateLine(line.packId, {
                      shadeCode: event.currentTarget.value,
                    })
                  }
                />
                <IconButton
                  icon="close"
                  label={`Remove ${line.title}`}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((item) => item.packId !== line.packId),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-text-secondary">No items yet.</p>
        )}
        <div className="flex items-center justify-between border-t border-border-default pt-4">
          <span className="text-body-large font-semibold">Items total</span>
          <span className="text-body-large font-semibold tabular-nums">
            {formatRupees(total)}
          </span>
        </div>
      </Card>

      <Card
        as="section"
        aria-labelledby="fulfilment-step"
        className="flex flex-col gap-4 p-5 medium:p-6"
      >
        <h2 id="fulfilment-step" className="text-heading3 font-semibold">
          3. Pickup or delivery
        </h2>
        <div
          onChange={(event) => {
            const target = event.target as HTMLInputElement;
            if (target.name === 'fulfilment') {
              setFulfilment(target.value as 'PICKUP' | 'DELIVERY');
            }
          }}
        >
          <RadioGroupField
            legend="How the customer gets it"
            name="fulfilment"
            defaultValue={fulfilment}
            options={[
              { value: 'PICKUP', label: 'Pickup at the shop' },
              {
                value: 'DELIVERY',
                label: 'Delivery',
                description: deliveryEnabled
                  ? 'Your delivery charge applies, free from your free-delivery amount.'
                  : 'Delivery is off in Shop settings.',
              },
            ]}
          />
        </div>
        {fulfilment === 'DELIVERY' ? (
          <TextareaField
            label="Delivery address"
            name="deliveryAddress"
            rows={3}
            maxLength={300}
            description={
              site
                ? `Leave empty to deliver to ${site.name}: ${site.address}`
                : undefined
            }
            value={address}
            onChange={(event) => setAddress(event.currentTarget.value)}
            error={errors.address || errors.deliveryAddress}
          />
        ) : null}
      </Card>

      <Card
        as="section"
        aria-labelledby="save-step"
        className="flex flex-col gap-4 p-5 medium:p-6"
      >
        <h2 id="save-step" className="text-heading3 font-semibold">
          4. Save
        </h2>
        {isOwner ? (
          <SelectField
            label="Paid by (only when handed over now)"
            name="paymentMethod"
            value={payment}
            onChange={(event) =>
              setPayment(event.currentTarget.value as PaymentMethod | '')
            }
            options={[
              { value: '', label: 'Not paid yet' },
              ...Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => submit(false)}
            pending={saving && savingKind === 'new'}
            pendingLabel="Saving…"
            disabled={saving}
          >
            Save as new order
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => submit(true)}
            pending={saving && savingKind === 'handed'}
            pendingLabel="Saving…"
            disabled={saving}
          >
            Handed over now
          </Button>
        </div>
        <p className="text-body text-text-secondary">
          A new order goes through packing as usual. “Handed over now” saves it
          as completed, for counter sales.
        </p>
      </Card>

      <SideSheet
        id={ADD_CUSTOMER_SHEET}
        title="Add customer"
        description="For people who order by phone or at the counter."
      >
        <CustomerForm
          action={addCustomerAction}
          submitLabel="Add customer"
          onCreated={onCreated}
        />
      </SideSheet>
    </div>
  );
}
