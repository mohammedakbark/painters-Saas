-- DropIndex
DROP INDEX "catalogue_categories_name_key_key";

-- AlterTable
ALTER TABLE "catalogue_categories" ADD COLUMN     "shop_id" UUID;

-- CreateIndex
CREATE INDEX "catalogue_categories_shop_id_idx" ON "catalogue_categories"("shop_id");

-- AddForeignKey
ALTER TABLE "catalogue_categories" ADD CONSTRAINT "catalogue_categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written (CAT-007, D-048). Names are unique regardless of case among the
-- platform's categories, and separately within each shop. The API also stops a
-- shop from repeating a platform category's name.
CREATE UNIQUE INDEX "catalogue_categories_platform_name_key"
  ON "catalogue_categories" ("name_key") WHERE "shop_id" IS NULL;
CREATE UNIQUE INDEX "catalogue_categories_shop_name_key"
  ON "catalogue_categories" ("shop_id", "name_key") WHERE "shop_id" IS NOT NULL;
