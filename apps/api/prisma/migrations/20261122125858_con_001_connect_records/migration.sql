-- CreateEnum
CREATE TYPE "connect_request_status" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "shop_customers" ADD COLUMN     "merged_at" TIMESTAMPTZ(3),
ADD COLUMN     "merged_into_id" UUID;

-- CreateTable
CREATE TABLE "customer_connect_requests" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "connect_request_status" NOT NULL DEFAULT 'PENDING',
    "customer_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "decided_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_connect_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_connect_requests_shop_id_phone_status_idx" ON "customer_connect_requests"("shop_id", "phone", "status");

-- CreateIndex
CREATE INDEX "customer_connect_requests_user_id_shop_id_idx" ON "customer_connect_requests"("user_id", "shop_id");

-- AddForeignKey
ALTER TABLE "customer_connect_requests" ADD CONSTRAINT "customer_connect_requests_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_connect_requests" ADD CONSTRAINT "customer_connect_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_connect_requests" ADD CONSTRAINT "customer_connect_requests_shop_id_customer_id_fkey" FOREIGN KEY ("shop_id", "customer_id") REFERENCES "shop_customers"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CON-001 (D-063): one open request per person and shop.
CREATE UNIQUE INDEX "customer_connect_requests_one_pending"
  ON "customer_connect_requests" ("shop_id", "user_id") WHERE "status" = 'PENDING';
ALTER TABLE "customer_connect_requests" ADD CONSTRAINT "customer_connect_requests_decided"
  CHECK (("status" = 'PENDING') = ("decided_at" IS NULL));
ALTER TABLE "customer_connect_requests" ENABLE ROW LEVEL SECURITY;

-- A merged record points at another record of the same shop and has no app account.
ALTER TABLE "shop_customers" ADD CONSTRAINT "shop_customers_merged_shape" CHECK (
  ("merged_into_id" IS NULL AND "merged_at" IS NULL)
  OR ("merged_into_id" IS NOT NULL AND "merged_at" IS NOT NULL
      AND "merged_into_id" <> "id" AND "user_id" IS NULL)
);
ALTER TABLE "shop_customers" ADD CONSTRAINT "shop_customers_merged_into_fkey"
  FOREIGN KEY ("shop_id", "merged_into_id") REFERENCES "shop_customers"("shop_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- A merged record no longer holds the mobile, so the shop can record it again.
DROP INDEX "shop_customers_recorded_phone_key";
CREATE UNIQUE INDEX "shop_customers_recorded_phone_key"
  ON "shop_customers" ("shop_id", "phone")
  WHERE "user_id" IS NULL AND "merged_into_id" IS NULL;

-- Bill entries stay append-only. The one exception is a merge (CON-001):
-- inside a transaction that sets paintshop.bill_merge = 'on', an entry may
-- move to another record of the same shop; nothing else may change.
CREATE OR REPLACE FUNCTION "bill_entries_block_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND current_setting('paintshop.bill_merge', true) = 'on'
     AND NEW.id = OLD.id AND NEW.shop_id = OLD.shop_id
     AND NEW.kind = OLD.kind AND NEW.amount_paise = OLD.amount_paise
     AND NEW.order_id IS NOT DISTINCT FROM OLD.order_id
     AND NEW.method IS NOT DISTINCT FROM OLD.method
     AND NEW.note IS NOT DISTINCT FROM OLD.note
     AND NEW.client_request_id IS NOT DISTINCT FROM OLD.client_request_id
     AND NEW.created_by_user_id IS NOT DISTINCT FROM OLD.created_by_user_id
     AND NEW.created_at = OLD.created_at
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'bill_entries is append-only';
END;
$$;
