-- CreateEnum
CREATE TYPE "shop_product_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "shop_products" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "catalogue_product_id" UUID,
    "custom_name" TEXT,
    "custom_name_key" TEXT,
    "brand_id" UUID,
    "custom_brand_name" TEXT,
    "category_id" UUID,
    "description" TEXT,
    "supports_shades" BOOLEAN,
    "status" "shop_product_status" NOT NULL DEFAULT 'ACTIVE',
    "image_key" TEXT,
    "image_updated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_product_packs" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "shop_product_id" UUID NOT NULL,
    "catalogue_pack_id" UUID,
    "quantity" DECIMAL(10,3),
    "unit" "pack_unit",
    "mrp_paise" INTEGER,
    "price_paise" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_product_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_shades" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "brand_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preview_hex" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_shades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_favourite_shades" (
    "shop_id" UUID NOT NULL,
    "shade_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_favourite_shades_pkey" PRIMARY KEY ("shop_id","shade_id")
);

-- CreateIndex
CREATE INDEX "shop_products_shop_id_status_idx" ON "shop_products"("shop_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shop_products_shop_id_id_key" ON "shop_products"("shop_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_products_shop_id_catalogue_product_id_key" ON "shop_products"("shop_id", "catalogue_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_products_shop_id_custom_name_key_key" ON "shop_products"("shop_id", "custom_name_key");

-- CreateIndex
CREATE INDEX "shop_product_packs_shop_id_idx" ON "shop_product_packs"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_product_packs_shop_product_id_catalogue_pack_id_key" ON "shop_product_packs"("shop_product_id", "catalogue_pack_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_product_packs_shop_product_id_quantity_unit_key" ON "shop_product_packs"("shop_product_id", "quantity", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "shop_shades_shop_id_code_key" ON "shop_shades"("shop_id", "code");

-- CreateIndex
CREATE INDEX "shop_favourite_shades_shade_id_idx" ON "shop_favourite_shades"("shade_id");

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_catalogue_product_id_fkey" FOREIGN KEY ("catalogue_product_id") REFERENCES "catalogue_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalogue_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_product_packs" ADD CONSTRAINT "shop_product_packs_shop_id_shop_product_id_fkey" FOREIGN KEY ("shop_id", "shop_product_id") REFERENCES "shop_products"("shop_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_product_packs" ADD CONSTRAINT "shop_product_packs_catalogue_pack_id_fkey" FOREIGN KEY ("catalogue_pack_id") REFERENCES "catalogue_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_shades" ADD CONSTRAINT "shop_shades_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_shades" ADD CONSTRAINT "shop_shades_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_favourite_shades" ADD CONSTRAINT "shop_favourite_shades_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_favourite_shades" ADD CONSTRAINT "shop_favourite_shades_shade_id_fkey" FOREIGN KEY ("shade_id") REFERENCES "shades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written constraints (CAT-002). Keep in sync with src/shop-catalogue/.
-- ---------------------------------------------------------------------------

-- A listing is either a brand-catalogue product or the shop's own product.
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_kind_check" CHECK (
  ("catalogue_product_id" IS NOT NULL AND "custom_name" IS NULL AND "custom_name_key" IS NULL
     AND "brand_id" IS NULL AND "custom_brand_name" IS NULL AND "category_id" IS NULL
     AND "supports_shades" IS NULL)
  OR
  ("catalogue_product_id" IS NULL AND "custom_name" IS NOT NULL AND "custom_name_key" IS NOT NULL
     AND "category_id" IS NOT NULL AND "supports_shades" IS NOT NULL
     AND NOT ("brand_id" IS NOT NULL AND "custom_brand_name" IS NOT NULL))
);
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_text_check" CHECK (
  ("custom_name" IS NULL OR ("custom_name" = btrim("custom_name") AND char_length("custom_name") BETWEEN 2 AND 120
     AND "custom_name_key" = lower("custom_name"))) AND
  ("custom_brand_name" IS NULL OR ("custom_brand_name" = btrim("custom_brand_name") AND char_length("custom_brand_name") BETWEEN 2 AND 80)) AND
  ("description" IS NULL OR ("description" = btrim("description") AND char_length("description") BETWEEN 1 AND 1000))
);
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_image_check" CHECK (
  num_nonnulls("image_key", "image_updated_at") IN (0, 2) AND
  ("image_key" IS NULL OR "image_key" ~ ('^shops/' || "shop_id"::text || '/products/' || "id"::text || '/image/[0-9a-f-]{36}$'))
);

-- A pack is a catalogue pack or an own size; prices are positive integers in
-- paise (up to Rs 1 crore); the selling price is not above the MRP when one is
-- given (selling above MRP is not allowed in India; rule to confirm, CAT-002).
ALTER TABLE "shop_product_packs" ADD CONSTRAINT "shop_product_packs_kind_check" CHECK (
  ("catalogue_pack_id" IS NOT NULL AND "quantity" IS NULL AND "unit" IS NULL)
  OR ("catalogue_pack_id" IS NULL AND "quantity" IS NOT NULL AND "unit" IS NOT NULL AND "quantity" > 0)
);
ALTER TABLE "shop_product_packs" ADD CONSTRAINT "shop_product_packs_price_check" CHECK (
  "price_paise" BETWEEN 1 AND 1000000000 AND
  ("mrp_paise" IS NULL OR ("mrp_paise" BETWEEN 1 AND 1000000000 AND "price_paise" <= "mrp_paise"))
);

-- Own shade codes: upper case, same pattern as brand shade cards.
ALTER TABLE "shop_shades" ADD CONSTRAINT "shop_shades_text_check" CHECK (
  "code" ~ '^[A-Z0-9][A-Z0-9 ./-]{0,19}$' AND
  "name" = btrim("name") AND char_length("name") BETWEEN 1 AND 80 AND
  ("preview_hex" IS NULL OR "preview_hex" ~ '^#[0-9A-F]{6}$')
);

-- Defense in depth (ADR 0005): RLS with no policies; the API is the table owner.
ALTER TABLE "shop_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shop_product_packs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shop_shades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shop_favourite_shades" ENABLE ROW LEVEL SECURITY;
