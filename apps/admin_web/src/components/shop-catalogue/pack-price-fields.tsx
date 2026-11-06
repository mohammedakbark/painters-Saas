import { CheckboxField } from '@/components/ui/checkbox-field';
import { Field } from '@/components/ui/field';
import { packFields } from '@/lib/shop-catalogue/forms';

/**
 * MRP, selling price and availability of one pack row (CAT-002). Field names
 * carry the row key, so several rows fit in one form with unique ids.
 */
export function PackPriceFields({
  rowKey,
  packLabel,
  values,
  errors,
  initial,
  disabled,
  priceRequired = true,
}: {
  rowKey: string;
  /** For example "4 L"; names the fields for screen readers. */
  packLabel: string;
  values?: Record<string, string>;
  errors: Record<string, string>;
  initial?: { mrp: string; price: string; available: boolean };
  disabled?: boolean;
  /** False for optional rows, such as the extra pack rows of a new product. */
  priceRequired?: boolean;
}) {
  const fields = packFields(rowKey);
  const available = values
    ? values[fields.available] === 'on'
    : (initial?.available ?? true);
  return (
    <>
      <Field
        label={`MRP of ${packLabel} (₹, optional)`}
        name={fields.mrp}
        inputMode="decimal"
        autoComplete="off"
        maxLength={14}
        disabled={disabled}
        defaultValue={values?.[fields.mrp] ?? initial?.mrp}
        error={errors[fields.mrp]}
      />
      <Field
        label={`Price of ${packLabel} (₹)`}
        required={priceRequired}
        name={fields.price}
        inputMode="decimal"
        autoComplete="off"
        maxLength={14}
        disabled={disabled}
        defaultValue={values?.[fields.price] ?? initial?.price}
        error={errors[fields.price]}
      />
      <CheckboxField
        label="Available"
        name={fields.available}
        description="Unavailable packs can't be bought."
        disabled={disabled}
        defaultChecked={available}
      />
    </>
  );
}
