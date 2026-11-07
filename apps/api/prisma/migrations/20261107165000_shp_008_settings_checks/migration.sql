-- Hand-written constraints (SHP-008). Keep in sync with
-- src/shops/shop-settings.schemas.ts.

ALTER TABLE "shops" ALTER COLUMN "order_messages" SET NOT NULL;

-- Flat charge from Rs 0 (free) to Rs 10,000; free delivery from Rs 1 up to
-- Rs 1 crore; delivery distance 1 to 50 km (D-049).
ALTER TABLE "shops" ADD CONSTRAINT "shops_delivery_charge_check" CHECK (
  "delivery_charge_paise" IS NULL
  OR "delivery_charge_paise" BETWEEN 0 AND 1000000
);

ALTER TABLE "shops" ADD CONSTRAINT "shops_free_delivery_above_check" CHECK (
  "free_delivery_above_paise" IS NULL
  OR "free_delivery_above_paise" BETWEEN 100 AND 1000000000
);

ALTER TABLE "shops" ADD CONSTRAINT "shops_delivery_radius_check" CHECK (
  "delivery_radius_km" IS NULL OR "delivery_radius_km" BETWEEN 1 AND 50
);

-- Delivery on needs a charge, a distance and the shop's map location.
ALTER TABLE "shops" ADD CONSTRAINT "shops_delivery_enabled_check" CHECK (
  NOT "delivery_enabled"
  OR (
    "delivery_charge_paise" IS NOT NULL
    AND "delivery_radius_km" IS NOT NULL
    AND "latitude" IS NOT NULL
  )
);

-- 0 to 10 messages (each 2 to 160 characters, checked by the API).
ALTER TABLE "shops" ADD CONSTRAINT "shops_order_messages_check" CHECK (
  cardinality("order_messages") <= 10
);
