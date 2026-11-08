'use client';

import {
  type FormEvent,
  startTransition,
  useActionState,
  useState,
} from 'react';
import { FormStatus } from '@/components/catalogue/form-status';
import type { FormAction } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroupField } from '@/components/ui/choice-group-fields';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Field } from '@/components/ui/field';
import { RequiredFieldsNote } from '@/components/ui/field-label';
import {
  openSideSheet,
  SheetCancel,
  SideSheet,
  useCloseSheetOnSave,
} from '@/components/ui/side-sheet';
import { TextareaField } from '@/components/ui/textarea-field';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import { formatRupees } from '@/lib/money';
import {
  ITEM_STATUS,
  type OrderItemStatus,
  PAYMENT_METHOD_LABEL,
  quantityTimesPrice,
} from '@/lib/orders/labels';
import { ORDER_NOTE_MAX } from '@/lib/orders/order-forms';

/** Submits in a transition so a failed save keeps what was typed. */
function useSheetForm(action: FormAction) {
  const [state, formAction, pending] = useActionState(action, {});
  useCloseSheetOnSave(state);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }
  return { state, formAction, pending, onSubmit };
}

function Actions({
  pending,
  label,
  pendingLabel,
  destructive = false,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="submit"
        variant={destructive ? 'destructive' : 'primary'}
        pending={pending}
        pendingLabel={pendingLabel}
      >
        {label}
      </Button>
      <SheetCancel />
    </div>
  );
}

/**
 * A ready message (the shop's order messages, SHP-008) or the shop's own
 * text. Field names are `<prefix>Choice` and `<prefix>Text`.
 */
function MessageChoice({
  prefix,
  legend,
  messages,
  state,
  textLabel,
}: {
  prefix: string;
  legend: string;
  messages: readonly string[];
  state: CatalogueFormState;
  textLabel: string;
}) {
  const choiceName = `${prefix}Choice`;
  const textName = `${prefix}Text`;
  const errors = state.fieldErrors ?? {};
  const first = messages.length > 0 ? messages[0]! : 'custom';
  const [choice, setChoice] = useState(state.values?.[choiceName] || first);
  return (
    <div
      className="flex flex-col gap-4"
      onChange={(event) => {
        const target = event.target as HTMLInputElement;
        if (target.name === choiceName) {
          setChoice(target.value);
        }
      }}
    >
      <RadioGroupField
        legend={legend}
        name={choiceName}
        required
        defaultValue={choice}
        error={errors[choiceName]}
        options={[
          ...messages.map((message) => ({ value: message, label: message })),
          { value: 'custom', label: 'Write my own' },
        ]}
      />
      {choice === 'custom' ? (
        <TextareaField
          label={textLabel}
          name={textName}
          required
          rows={3}
          maxLength={ORDER_NOTE_MAX}
          defaultValue={state.values?.[textName]}
          error={errors[textName]}
        />
      ) : null}
    </div>
  );
}

const CANCEL_SHEET = 'cancel-order';
const PAYMENT_SHEET = 'record-payment';

export function CancelOrderSheet({
  action,
  messages,
}: {
  action: FormAction;
  messages: readonly string[];
}) {
  return (
    <SideSheet
      id={CANCEL_SHEET}
      title="Cancel order"
      description="The customer sees your reason. A cancelled order can't be opened again."
    >
      <CancelOrderForm action={action} messages={messages} />
    </SideSheet>
  );
}

function CancelOrderForm({
  action,
  messages,
}: {
  action: FormAction;
  messages: readonly string[];
}) {
  const { state, formAction, pending, onSubmit } = useSheetForm(action);
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <FormStatus state={state} />
      <MessageChoice
        prefix="cancel"
        legend="Reason"
        messages={messages}
        state={state}
        textLabel="Your reason"
      />
      <Actions
        pending={pending}
        label="Cancel order"
        pendingLabel="Cancelling…"
        destructive
      />
    </form>
  );
}

export function CancelOrderButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      aria-haspopup="dialog"
      onClick={() => openSideSheet(CANCEL_SHEET)}
    >
      Cancel order
    </Button>
  );
}

export function PaymentSheet({ action }: { action: FormAction }) {
  return (
    <SideSheet
      id={PAYMENT_SHEET}
      title="Record payment"
      description="Record how the customer paid at pickup or delivery."
    >
      <PaymentForm action={action} />
    </SideSheet>
  );
}

function PaymentForm({ action }: { action: FormAction }) {
  const { state, formAction, pending, onSubmit } = useSheetForm(action);
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <FormStatus state={state} />
      <RadioGroupField
        legend="Paid by"
        name="method"
        required
        defaultValue={state.values?.method ?? 'CASH'}
        error={state.fieldErrors?.method}
        options={Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      <Actions
        pending={pending}
        label="Record payment"
        pendingLabel="Saving…"
      />
    </form>
  );
}

export function PaymentButton() {
  return (
    <Button
      type="button"
      aria-haspopup="dialog"
      onClick={() => openSideSheet(PAYMENT_SHEET)}
    >
      Record payment
    </Button>
  );
}

// --- Items ------------------------------------------------------------------

export interface OrderLine {
  id: string;
  productName: string;
  brandName: string | null;
  packLabel: string;
  shadeCode: string | null;
  shadeName: string | null;
  unitPricePaise: number;
  quantity: number;
  returnedQuantity: number;
  countedPaise: number;
  status: OrderItemStatus;
  shopNote: string | null;
  substituteForId: string | null;
}

const NA_SHEET = 'item-not-available';
const SUB_SHEET = 'item-substitute';
const RETURN_SHEET = 'item-return';

/**
 * The order's lines with their actions (ORD-002). Each action has one sheet
 * for the whole order; the chosen line goes in a hidden field.
 */
export function OrderItems({
  items,
  canEditItems,
  canReturnItems,
  isOwner,
  messages,
  notAvailableAction,
  substituteAction,
  returnAction,
  searchPacks,
}: {
  items: readonly OrderLine[];
  canEditItems: boolean;
  canReturnItems: boolean;
  isOwner: boolean;
  messages: readonly string[];
  notAvailableAction: FormAction;
  substituteAction: FormAction;
  returnAction: FormAction;
  searchPacks: (text: string) => Promise<ComboboxOption[]>;
}) {
  const [selected, setSelected] = useState<OrderLine | null>(null);
  const open = (item: OrderLine, sheet: string) => {
    setSelected(item);
    openSideSheet(sheet);
  };
  // Substitutes sit under the line they replace.
  const originals = items.filter((item) => item.substituteForId === null);
  const ordered = originals.flatMap((item) => [
    item,
    ...items.filter((other) => other.substituteForId === item.id),
  ]);
  const hasOpenOffer = (item: OrderLine) =>
    items.some(
      (other) =>
        other.substituteForId === item.id &&
        other.status === 'SUBSTITUTE_OFFERED',
    );
  const title = selected
    ? `${selected.productName}, ${selected.packLabel}`
    : undefined;

  return (
    <>
      <ul className="flex flex-col divide-y divide-border-default">
        {ordered.map((item) => {
          const badge = ITEM_STATUS[item.status];
          const counted = item.status === 'OK';
          const editable =
            canEditItems &&
            (item.status === 'OK' || item.status === 'NOT_AVAILABLE') &&
            !hasOpenOffer(item);
          const returnable =
            canReturnItems &&
            isOwner &&
            counted &&
            item.returnedQuantity < item.quantity;
          return (
            <li
              key={item.id}
              className={
                item.substituteForId
                  ? 'flex flex-col gap-3 py-4 pl-6 medium:flex-row medium:items-start medium:justify-between'
                  : 'flex flex-col gap-3 py-4 medium:flex-row medium:items-start medium:justify-between'
              }
            >
              <div className="flex min-w-0 flex-col gap-1">
                {item.substituteForId ? (
                  <span className="text-caption font-semibold text-text-secondary">
                    Suggested instead
                  </span>
                ) : null}
                <span className="text-body-large font-semibold">
                  {item.productName}
                </span>
                <span className="text-body text-text-secondary">
                  {[item.brandName, item.packLabel].filter(Boolean).join(' · ')}
                  {item.shadeCode
                    ? ` · Shade ${item.shadeCode}${item.shadeName ? ` ${item.shadeName}` : ''}`
                    : ''}
                </span>
                <span className="text-body tabular-nums text-text-secondary">
                  {quantityTimesPrice(item.quantity, item.unitPricePaise)}
                  {item.returnedQuantity > 0
                    ? ` · ${item.returnedQuantity} returned`
                    : ''}
                </span>
                {badge || item.shopNote ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {badge ? (
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    ) : null}
                    {item.shopNote && item.status === 'NOT_AVAILABLE' ? (
                      <span className="text-body text-text-secondary">
                        “{item.shopNote}”
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 medium:items-end">
                <span
                  className={
                    counted
                      ? 'text-body-large font-semibold tabular-nums'
                      : 'text-body-large tabular-nums text-text-disabled line-through'
                  }
                >
                  {formatRupees(
                    counted
                      ? item.countedPaise
                      : item.unitPricePaise * item.quantity,
                  )}
                </span>
                {editable || returnable ? (
                  <div className="flex flex-wrap gap-2">
                    {editable && item.status === 'OK' ? (
                      <Button
                        type="button"
                        variant="tertiary"
                        aria-haspopup="dialog"
                        onClick={() => open(item, NA_SHEET)}
                      >
                        Not available
                      </Button>
                    ) : null}
                    {editable ? (
                      <Button
                        type="button"
                        variant="tertiary"
                        aria-haspopup="dialog"
                        onClick={() => open(item, SUB_SHEET)}
                      >
                        Suggest substitute
                      </Button>
                    ) : null}
                    {returnable ? (
                      <Button
                        type="button"
                        variant="tertiary"
                        aria-haspopup="dialog"
                        onClick={() => open(item, RETURN_SHEET)}
                      >
                        Record return
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <SideSheet
        id={NA_SHEET}
        title="Item not available"
        description={
          title ? `${title}. It no longer counts towards the total.` : undefined
        }
      >
        {selected ? (
          <NotAvailableForm
            key={selected.id}
            action={notAvailableAction}
            itemId={selected.id}
            messages={messages}
          />
        ) : null}
      </SideSheet>
      <SideSheet
        id={SUB_SHEET}
        title="Suggest a substitute"
        description={
          title
            ? `Instead of ${title}. It counts once the customer accepts.`
            : undefined
        }
      >
        {selected ? (
          <SubstituteForm
            key={selected.id}
            action={substituteAction}
            item={selected}
            messages={messages}
            searchPacks={searchPacks}
          />
        ) : null}
      </SideSheet>
      <SideSheet
        id={RETURN_SHEET}
        title="Record a return"
        description={
          title ? `${title}. The order total is adjusted.` : undefined
        }
      >
        {selected ? (
          <ReturnForm key={selected.id} action={returnAction} item={selected} />
        ) : null}
      </SideSheet>
    </>
  );
}

function NotAvailableForm({
  action,
  itemId,
  messages,
}: {
  action: FormAction;
  itemId: string;
  messages: readonly string[];
}) {
  const { state, formAction, pending, onSubmit } = useSheetForm(action);
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <FormStatus state={state} />
      <MessageChoice
        prefix="na"
        legend="Message for the customer"
        messages={messages}
        state={state}
        textLabel="Your message"
      />
      <Actions
        pending={pending}
        label="Mark not available"
        pendingLabel="Saving…"
      />
    </form>
  );
}

function SubstituteForm({
  action,
  item,
  messages,
  searchPacks,
}: {
  action: FormAction;
  item: OrderLine;
  messages: readonly string[];
  searchPacks: (text: string) => Promise<ComboboxOption[]>;
}) {
  const { state, formAction, pending, onSubmit } = useSheetForm(action);
  const errors = state.fieldErrors ?? {};
  const [pack, setPack] = useState<{ id: string; title: string } | null>(
    state.values?.packId
      ? { id: state.values.packId, title: state.values.packTitle ?? '' }
      : null,
  );
  // An item already marked not available keeps its message.
  const needsMessage = item.status === 'OK';
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="packId" value={pack?.id ?? ''} />
      <input type="hidden" name="packTitle" value={pack?.title ?? ''} />
      <FormStatus state={state} />
      <RequiredFieldsNote />
      <div className="flex flex-col gap-2">
        <Combobox
          label="Product and pack size"
          description="Search your products. Only available pack sizes are listed."
          placeholder="Search by name or brand"
          search={searchPacks}
          onSelect={(option) => setPack({ id: option.id, title: option.title })}
          emptyLabel="No available pack size matches."
        />
        {pack ? (
          <p className="text-body">
            Chosen: <span className="font-semibold">{pack.title}</span>
          </p>
        ) : null}
        {errors.pack ? (
          <p className="text-body text-status-error">{errors.pack}</p>
        ) : null}
      </div>
      <div className="grid gap-4 medium:grid-cols-2">
        <Field
          label="Quantity"
          name="quantity"
          inputMode="numeric"
          required
          defaultValue={state.values?.quantity ?? String(item.quantity)}
          error={errors.quantity}
        />
        <Field
          label="Shade code (optional)"
          name="shadeCode"
          maxLength={40}
          defaultValue={state.values?.shadeCode ?? item.shadeCode ?? ''}
          error={errors.shadeCode}
        />
      </div>
      {needsMessage ? (
        <MessageChoice
          prefix="sub"
          legend="Message for the customer"
          messages={messages}
          state={state}
          textLabel="Your message"
        />
      ) : item.shopNote ? (
        <p className="text-body text-text-secondary">
          The customer already has your message: “{item.shopNote}”
        </p>
      ) : null}
      <Actions
        pending={pending}
        label="Suggest substitute"
        pendingLabel="Saving…"
      />
    </form>
  );
}

function ReturnForm({ action, item }: { action: FormAction; item: OrderLine }) {
  const { state, formAction, pending, onSubmit } = useSheetForm(action);
  const errors = state.fieldErrors ?? {};
  const left = item.quantity - item.returnedQuantity;
  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="itemId" value={item.id} />
      <FormStatus state={state} />
      <RequiredFieldsNote />
      <Field
        label="Quantity returned"
        name="quantity"
        inputMode="numeric"
        required
        description={`Up to ${left}.`}
        defaultValue={state.values?.quantity ?? '1'}
        error={errors.quantity}
      />
      <TextareaField
        label="Reason"
        name="reason"
        required
        rows={3}
        maxLength={ORDER_NOTE_MAX}
        defaultValue={state.values?.reason}
        error={errors.reason}
      />
      <p className="text-body text-text-secondary">
        Refunds are not recorded yet; they come with bills.
      </p>
      <Actions pending={pending} label="Record return" pendingLabel="Saving…" />
    </form>
  );
}
