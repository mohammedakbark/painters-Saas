-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "client_request_id" UUID,
ADD COLUMN     "customer_site_id" UUID;

-- CreateTable
CREATE TABLE "customer_delivery_locations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_delivery_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_delivery_locations_user_id_archived_at_idx" ON "customer_delivery_locations"("user_id", "archived_at");

-- CreateIndex
CREATE INDEX "orders_customer_site_id_idx" ON "orders"("customer_site_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shop_id_client_request_id_key" ON "orders"("shop_id", "client_request_id");

-- CreateIndex
CREATE INDEX "shop_customers_user_id_idx" ON "shop_customers"("user_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_site_id_fkey" FOREIGN KEY ("customer_site_id") REFERENCES "customer_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_delivery_locations" ADD CONSTRAINT "customer_delivery_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Same text and pin rules as the painter's sites (CUS-005); India only.
ALTER TABLE "customer_delivery_locations" ADD CONSTRAINT "customer_delivery_locations_text_check" CHECK (
  char_length("label") BETWEEN 1 AND 40 AND "label" = btrim("label")
  AND char_length("address") BETWEEN 5 AND 300
);
ALTER TABLE "customer_delivery_locations" ADD CONSTRAINT "customer_delivery_locations_pin_check" CHECK (
  "latitude" BETWEEN 6 AND 38 AND "longitude" BETWEEN 68 AND 98
);
-- Active labels are unique per person, regardless of case.
CREATE UNIQUE INDEX "customer_delivery_locations_active_label_key"
  ON "customer_delivery_locations" ("user_id", lower("label")) WHERE "archived_at" IS NULL;

-- A painter's site is only on app orders (D-049, CUS-006).
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_site_source_check" CHECK (
  "customer_site_id" IS NULL OR "source" = 'APP'
);

ALTER TABLE "customer_delivery_locations" ENABLE ROW LEVEL SECURITY;
