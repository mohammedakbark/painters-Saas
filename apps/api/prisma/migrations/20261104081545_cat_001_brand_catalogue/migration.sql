-- CreateEnum
CREATE TYPE "pack_unit" AS ENUM ('LITRE', 'MILLILITRE', 'KILOGRAM', 'GRAM', 'PIECE');

-- CreateTable
CREATE TABLE "catalogue_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "catalogue_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_products" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "description" TEXT,
    "supports_shades" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "image_key" TEXT,
    "image_updated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "catalogue_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_packs" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" "pack_unit" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogue_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shades" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preview_hex" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_categories_name_key_key" ON "catalogue_categories"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key_key" ON "brands"("name_key");

-- CreateIndex
CREATE INDEX "catalogue_products_category_id_idx" ON "catalogue_products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_products_brand_id_name_key_key" ON "catalogue_products"("brand_id", "name_key");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_packs_product_id_quantity_unit_key" ON "catalogue_packs"("product_id", "quantity", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "shades_brand_id_code_key" ON "shades"("brand_id", "code");

-- AddForeignKey
ALTER TABLE "catalogue_products" ADD CONSTRAINT "catalogue_products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_products" ADD CONSTRAINT "catalogue_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalogue_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_packs" ADD CONSTRAINT "catalogue_packs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalogue_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shades" ADD CONSTRAINT "shades_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
