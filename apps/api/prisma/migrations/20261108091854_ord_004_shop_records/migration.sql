-- CreateEnum
CREATE TYPE "customer_kind" AS ENUM ('PAINTER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "order_source" AS ENUM ('APP', 'SHOP');

-- DropIndex
DROP INDEX "shop_customers_shop_id_phone_key";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "created_by_user_id" UUID,
ADD COLUMN     "site_id" UUID,
ADD COLUMN     "source" "order_source" NOT NULL DEFAULT 'APP';

-- AlterTable
ALTER TABLE "shop_customers" ADD COLUMN     "kind" "customer_kind" NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE "shop_sites" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_name" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_sites_shop_id_customer_id_idx" ON "shop_sites"("shop_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_sites_shop_id_id_key" ON "shop_sites"("shop_id", "id");

-- CreateIndex
CREATE INDEX "shop_customers_shop_id_phone_idx" ON "shop_customers"("shop_id", "phone");

-- AddForeignKey
ALTER TABLE "shop_sites" ADD CONSTRAINT "shop_sites_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "shop_customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_site_id_fkey" FOREIGN KEY ("shop_id", "site_id") REFERENCES "shop_sites"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written constraints (ORD-004). Keep in sync with src/customers/ and src/orders/.

-- One shop-recorded customer per mobile; an app-linked record with the same
-- mobile can exist beside it and is never merged automatically (D-054, D-055).
CREATE UNIQUE INDEX "shop_customers_recorded_phone_key"
  ON "shop_customers" ("shop_id", "phone") WHERE "user_id" IS NULL;

ALTER TABLE "shop_sites" ADD CONSTRAINT "shop_sites_text_check" CHECK (
  char_length("name") BETWEEN 2 AND 80 AND "name" = btrim("name")
  AND ("owner_name" IS NULL OR char_length("owner_name") BETWEEN 1 AND 120)
  AND char_length("address") BETWEEN 5 AND 300
);
ALTER TABLE "shop_sites" ADD CONSTRAINT "shop_sites_pin_check" CHECK (
  ("latitude" IS NULL) = ("longitude" IS NULL)
  AND ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90)
  AND ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180)
);
-- Active site names are unique per customer, regardless of case.
CREATE UNIQUE INDEX "shop_sites_active_name_key"
  ON "shop_sites" ("customer_id", lower("name")) WHERE "archived_at" IS NULL;

-- Delivery always needs an address. App orders also carry the drop point and
-- distance; orders the shop records may have them (from a site pin) or not.
ALTER TABLE "orders" DROP CONSTRAINT "orders_delivery_check";
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_check" CHECK (
  ("fulfilment" = 'DELIVERY'
    AND "delivery_address" IS NOT NULL
    AND ("delivery_latitude" IS NULL) = ("delivery_longitude" IS NULL)
    AND ("delivery_latitude" IS NULL) = ("delivery_distance_km" IS NULL)
    AND ("source" = 'SHOP' OR "delivery_latitude" IS NOT NULL))
  OR ("fulfilment" = 'PICKUP'
    AND "delivery_address" IS NULL
    AND "delivery_latitude" IS NULL
    AND "delivery_longitude" IS NULL
    AND "delivery_distance_km" IS NULL
    AND "delivery_charge_paise" = 0)
);
ALTER TABLE "orders" ADD CONSTRAINT "orders_source_check" CHECK (
  ("source" = 'SHOP') = ("created_by_user_id" IS NOT NULL)
);

ALTER TABLE "shop_sites" ENABLE ROW LEVEL SECURITY;
