-- CreateEnum
CREATE TYPE "shop_review_decision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "shop_review_reason" AS ENUM ('PHOTO_MISSING_OR_UNCLEAR', 'LOCATION_MISSING_OR_WRONG', 'ADDRESS_INCOMPLETE', 'SUPPORT_PHONE_INVALID', 'PRODUCTS_INSUFFICIENT', 'PRODUCT_DETAILS_INCORRECT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "shop_status" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "shop_status" ADD VALUE 'CHANGES_REQUESTED';
ALTER TYPE "shop_status" ADD VALUE 'ACTIVE';

-- CreateTable
CREATE TABLE "shop_reviews" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "open_shop_id" UUID,
    "submitted_from" "shop_status" NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "shop_review_decision",
    "decided_by_user_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "reasons" "shop_review_reason"[] DEFAULT ARRAY[]::"shop_review_reason"[],
    "note" TEXT,

    CONSTRAINT "shop_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_reviews_open_shop_id_key" ON "shop_reviews"("open_shop_id");

-- CreateIndex
CREATE INDEX "shop_reviews_shop_id_submitted_at_idx" ON "shop_reviews"("shop_id", "submitted_at");

-- CreateIndex
CREATE INDEX "shop_reviews_decision_submitted_at_idx" ON "shop_reviews"("decision", "submitted_at");

-- AddForeignKey
ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defense in depth (ADR 0005): RLS with no policies; the API is the table owner.
ALTER TABLE "shop_reviews" ENABLE ROW LEVEL SECURITY;
