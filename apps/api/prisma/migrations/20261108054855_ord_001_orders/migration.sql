-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('NEW', 'PACKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "order_fulfilment" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "order_payment_status" AS ENUM ('UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "order_cancelled_by" AS ENUM ('CUSTOMER', 'SHOP');

-- CreateEnum
CREATE TYPE "order_item_status" AS ENUM ('OK', 'NOT_AVAILABLE', 'SUBSTITUTED', 'SUBSTITUTE_OFFERED', 'SUBSTITUTE_DECLINED');

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "next_order_number" INTEGER NOT NULL DEFAULT 1001;

-- CreateTable
CREATE TABLE "shop_customers" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "customer_id" UUID NOT NULL,
    "site_label" TEXT,
    "fulfilment" "order_fulfilment" NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'NEW',
    "delivery_address" TEXT,
    "delivery_latitude" DECIMAL(9,6),
    "delivery_longitude" DECIMAL(9,6),
    "delivery_distance_km" DECIMAL(6,2),
    "items_total_paise" INTEGER NOT NULL,
    "delivery_charge_paise" INTEGER NOT NULL DEFAULT 0,
    "total_paise" INTEGER NOT NULL,
    "payment_status" "order_payment_status" NOT NULL DEFAULT 'UNPAID',
    "payment_method" "payment_method",
    "paid_at" TIMESTAMPTZ(3),
    "paid_by_user_id" UUID,
    "cancelled_by" "order_cancelled_by",
    "cancel_reason" TEXT,
    "placed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "shop_product_pack_id" UUID,
    "product_name" TEXT NOT NULL,
    "brand_name" TEXT,
    "pack_label" TEXT NOT NULL,
    "shade_code" TEXT,
    "shade_name" TEXT,
    "unit_price_paise" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "returned_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "order_item_status" NOT NULL DEFAULT 'OK',
    "shop_note" TEXT,
    "substitute_for_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actor_user_id" UUID,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_customers_shop_id_id_key" ON "shop_customers"("shop_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_customers_shop_id_phone_key" ON "shop_customers"("shop_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "shop_customers_shop_id_user_id_key" ON "shop_customers"("shop_id", "user_id");

-- CreateIndex
CREATE INDEX "orders_shop_id_status_placed_at_idx" ON "orders"("shop_id", "status", "placed_at");

-- CreateIndex
CREATE INDEX "orders_shop_id_placed_at_idx" ON "orders"("shop_id", "placed_at");

-- CreateIndex
CREATE INDEX "orders_shop_id_customer_id_idx" ON "orders"("shop_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shop_id_id_key" ON "orders"("shop_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shop_id_number_key" ON "orders"("shop_id", "number");

-- CreateIndex
CREATE INDEX "order_items_shop_id_order_id_idx" ON "order_items"("shop_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_position_key" ON "order_items"("order_id", "position");

-- CreateIndex
CREATE INDEX "order_events_shop_id_order_id_created_at_idx" ON "order_events"("shop_id", "order_id", "created_at");

-- AddForeignKey
ALTER TABLE "shop_customers" ADD CONSTRAINT "shop_customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_customers" ADD CONSTRAINT "shop_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "shop_customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shop_product_pack_id_fkey" FOREIGN KEY ("shop_product_pack_id") REFERENCES "shop_product_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_substitute_for_id_fkey" FOREIGN KEY ("substitute_for_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written constraints (ORD-001). Keep in sync with src/orders/.

ALTER TABLE "shops" ADD CONSTRAINT "shops_next_order_number_check" CHECK ("next_order_number" >= 1);

ALTER TABLE "shop_customers" ADD CONSTRAINT "shop_customers_name_check" CHECK (char_length("name") BETWEEN 1 AND 120 AND "name" = btrim("name"));
ALTER TABLE "shop_customers" ADD CONSTRAINT "shop_customers_phone_e164_check" CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$');

ALTER TABLE "orders" ADD CONSTRAINT "orders_number_check" CHECK ("number" >= 1);
ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_check" CHECK (
  "items_total_paise" >= 0
  AND "delivery_charge_paise" >= 0
  AND "total_paise" = "items_total_paise" + "delivery_charge_paise"
);
-- Delivery details exist only for delivery orders; pickup is free.
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_check" CHECK (
  ("fulfilment" = 'DELIVERY'
    AND "delivery_address" IS NOT NULL
    AND "delivery_latitude" IS NOT NULL
    AND "delivery_longitude" IS NOT NULL
    AND "delivery_distance_km" IS NOT NULL)
  OR ("fulfilment" = 'PICKUP'
    AND "delivery_address" IS NULL
    AND "delivery_latitude" IS NULL
    AND "delivery_longitude" IS NULL
    AND "delivery_distance_km" IS NULL
    AND "delivery_charge_paise" = 0)
);
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_check" CHECK (
  ("payment_status" = 'PAID' AND "payment_method" IS NOT NULL AND "paid_at" IS NOT NULL)
  OR ("payment_status" = 'UNPAID' AND "payment_method" IS NULL AND "paid_at" IS NULL)
);
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancel_check" CHECK (
  ("status" = 'CANCELLED') = ("cancelled_at" IS NOT NULL AND "cancelled_by" IS NOT NULL)
);
ALTER TABLE "orders" ADD CONSTRAINT "orders_text_check" CHECK (
  ("site_label" IS NULL OR char_length("site_label") BETWEEN 1 AND 120)
  AND ("delivery_address" IS NULL OR char_length("delivery_address") BETWEEN 5 AND 300)
  AND ("cancel_reason" IS NULL OR char_length("cancel_reason") BETWEEN 1 AND 200)
);

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK (
  "quantity" BETWEEN 1 AND 999
  AND "returned_quantity" BETWEEN 0 AND "quantity"
  AND "unit_price_paise" BETWEEN 1 AND 1000000000
  AND "position" >= 1
);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_substitute_check" CHECK (
  ("status" IN ('SUBSTITUTE_OFFERED', 'SUBSTITUTE_DECLINED') AND "substitute_for_id" IS NOT NULL)
  OR "status" NOT IN ('SUBSTITUTE_OFFERED', 'SUBSTITUTE_DECLINED')
);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_note_check" CHECK (
  "shop_note" IS NULL OR char_length("shop_note") BETWEEN 2 AND 200
);

-- The order timeline is append-only, like audit_events.
CREATE FUNCTION "order_events_block_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'order_events is append-only';
END;
$$;

CREATE TRIGGER "order_events_append_only"
BEFORE UPDATE OR DELETE ON "order_events"
FOR EACH ROW EXECUTE FUNCTION "order_events_block_mutation"();

-- Defense in depth (ADR 0005): RLS on, no policies.
ALTER TABLE "shop_customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_events" ENABLE ROW LEVEL SECURITY;
