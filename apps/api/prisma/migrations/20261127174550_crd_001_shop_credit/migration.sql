-- CreateEnum
CREATE TYPE "credit_event_kind" AS ENUM ('ID_CHECKED', 'GIVEN', 'LIMIT_CHANGED', 'STOPPED', 'OVERRIDE');

-- CreateEnum
CREATE TYPE "id_document_type" AS ENUM ('AADHAAR', 'PAN', 'VOTER_ID', 'DRIVING_LICENCE', 'PASSPORT');

-- CreateTable
CREATE TABLE "credit_events" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "kind" "credit_event_kind" NOT NULL,
    "limit_paise" INTEGER,
    "previous_paise" INTEGER,
    "owed_paise" INTEGER,
    "id_type" "id_document_type",
    "id_last4" TEXT,
    "reason" TEXT,
    "order_id" UUID,
    "client_request_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_events_shop_id_customer_id_created_at_idx" ON "credit_events"("shop_id", "customer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_events_shop_id_client_request_id_key" ON "credit_events"("shop_id", "client_request_id");

-- AddForeignKey
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "shop_customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_shop_id_order_id_fkey" FOREIGN KEY ("shop_id", "order_id") REFERENCES "orders"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CRD-001 (D-064): the shape of each kind of event. An ID check keeps the
-- type and last 4 characters only, never the full number or an image.
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_kind_shape" CHECK (
  CASE "kind"
    WHEN 'ID_CHECKED' THEN "id_type" IS NOT NULL AND "id_last4" ~ '^[A-Z0-9]{4}$' AND "limit_paise" IS NULL AND "order_id" IS NULL
    WHEN 'GIVEN' THEN "limit_paise" > 0 AND "id_type" IS NULL AND "order_id" IS NULL AND "reason" IS NOT NULL
    WHEN 'LIMIT_CHANGED' THEN "limit_paise" > 0 AND "previous_paise" > 0 AND "id_type" IS NULL AND "order_id" IS NULL AND "reason" IS NOT NULL
    WHEN 'STOPPED' THEN "limit_paise" IS NULL AND "previous_paise" > 0 AND "id_type" IS NULL AND "order_id" IS NULL AND "reason" IS NOT NULL
    WHEN 'OVERRIDE' THEN "limit_paise" > 0 AND "owed_paise" > "limit_paise" AND "order_id" IS NOT NULL AND "id_type" IS NULL
  END
);
ALTER TABLE "credit_events" ADD CONSTRAINT "credit_events_reason_length" CHECK (char_length("reason") BETWEEN 2 AND 300);

-- An order is accepted over the limit once.
CREATE UNIQUE INDEX "credit_events_one_override_per_order" ON "credit_events"("order_id") WHERE "kind" = 'OVERRIDE';

-- Append-only, like bill_entries.
CREATE FUNCTION "credit_events_block_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'credit_events is append-only';
END;
$$;

CREATE TRIGGER "credit_events_append_only"
BEFORE UPDATE OR DELETE ON "credit_events"
FOR EACH ROW EXECUTE FUNCTION "credit_events_block_mutation"();

-- Defense in depth (ADR 0005): RLS on, no policies.
ALTER TABLE "credit_events" ENABLE ROW LEVEL SECURITY;
