-- CreateTable
CREATE TABLE "customer_sites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_name" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_sites_user_id_archived_at_idx" ON "customer_sites"("user_id", "archived_at");

-- AddForeignKey
ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Same rules as the sites a shop records (ORD-004), but the pin is required
-- (D-049, owner 2026-11-20) and must be in India.
ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_text_check" CHECK (
  char_length("name") BETWEEN 2 AND 80 AND "name" = btrim("name")
  AND ("owner_name" IS NULL OR char_length("owner_name") BETWEEN 1 AND 120)
  AND char_length("address") BETWEEN 5 AND 300
);
ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_pin_check" CHECK (
  "latitude" BETWEEN 6 AND 38 AND "longitude" BETWEEN 68 AND 98
);
-- Active site names are unique per painter, regardless of case.
CREATE UNIQUE INDEX "customer_sites_active_name_key"
  ON "customer_sites" ("user_id", lower("name")) WHERE "archived_at" IS NULL;

ALTER TABLE "customer_sites" ENABLE ROW LEVEL SECURITY;
