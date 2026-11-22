-- CreateEnum
CREATE TYPE "bill_entry_kind" AS ENUM ('CHARGE', 'ADJUSTMENT', 'PAYMENT', 'REFUND');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "charged_at" TIMESTAMPTZ(3),
ADD COLUMN     "paid_paise" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "bill_entries" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "kind" "bill_entry_kind" NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "order_id" UUID,
    "method" "payment_method",
    "note" TEXT,
    "client_request_id" UUID,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bill_entries_shop_id_customer_id_created_at_idx" ON "bill_entries"("shop_id", "customer_id", "created_at");

-- CreateIndex
CREATE INDEX "bill_entries_order_id_idx" ON "bill_entries"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "bill_entries_shop_id_client_request_id_key" ON "bill_entries"("shop_id", "client_request_id");

-- AddForeignKey
ALTER TABLE "bill_entries" ADD CONSTRAINT "bill_entries_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_entries" ADD CONSTRAINT "bill_entries_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "shop_customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_entries" ADD CONSTRAINT "bill_entries_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BIL-001 (D-062): the shape of each kind of entry.
ALTER TABLE "bill_entries" ADD CONSTRAINT "bill_entries_kind_shape" CHECK (
  CASE "kind"
    WHEN 'CHARGE' THEN "amount_paise" >= 0 AND "order_id" IS NOT NULL AND "method" IS NULL
    WHEN 'ADJUSTMENT' THEN "amount_paise" <> 0 AND "order_id" IS NOT NULL AND "method" IS NULL
    WHEN 'PAYMENT' THEN "amount_paise" < 0 AND "method" IS NOT NULL
    WHEN 'REFUND' THEN "amount_paise" > 0 AND "method" IS NOT NULL AND "order_id" IS NULL
  END
);
ALTER TABLE "bill_entries" ADD CONSTRAINT "bill_entries_note_length" CHECK (char_length("note") <= 300);

-- An order goes on the bill once.
CREATE UNIQUE INDEX "bill_entries_one_charge_per_order" ON "bill_entries"("order_id") WHERE "kind" = 'CHARGE';

ALTER TABLE "orders" ADD CONSTRAINT "orders_paid_paise_range" CHECK ("paid_paise" >= 0);

-- Append-only, like order_events and audit_events.
CREATE FUNCTION "bill_entries_block_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'bill_entries is append-only';
END;
$$;

CREATE TRIGGER "bill_entries_append_only"
BEFORE UPDATE OR DELETE ON "bill_entries"
FOR EACH ROW EXECUTE FUNCTION "bill_entries_block_mutation"();

-- Defense in depth (ADR 0005): RLS on, no policies.
ALTER TABLE "bill_entries" ENABLE ROW LEVEL SECURITY;

-- Back-fill: orders completed or paid before BIL-001 go on the bill at
-- today's total, and a paid order's payment is its total (returns before
-- BIL-001 were settled outside the app).
UPDATE "orders"
SET "charged_at" = COALESCE("completed_at", "paid_at")
WHERE "status" = 'COMPLETED' OR "payment_status" = 'PAID';

INSERT INTO "bill_entries" ("id", "shop_id", "customer_id", "kind", "amount_paise", "order_id", "created_at")
SELECT gen_random_uuid(), "shop_id", "customer_id", 'CHARGE', "total_paise", "id", "charged_at"
FROM "orders"
WHERE "charged_at" IS NOT NULL;

INSERT INTO "bill_entries" ("id", "shop_id", "customer_id", "kind", "amount_paise", "order_id", "method", "created_by_user_id", "created_at")
SELECT gen_random_uuid(), "shop_id", "customer_id", 'PAYMENT', -"total_paise", "id", "payment_method", "paid_by_user_id", "paid_at"
FROM "orders"
WHERE "payment_status" = 'PAID' AND "total_paise" > 0;

UPDATE "orders" SET "paid_paise" = "total_paise" WHERE "payment_status" = 'PAID';
