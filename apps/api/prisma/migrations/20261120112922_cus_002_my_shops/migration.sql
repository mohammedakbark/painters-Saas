-- CreateTable
CREATE TABLE "customer_shops" (
    "user_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_shops_pkey" PRIMARY KEY ("user_id","shop_id")
);

-- CreateIndex
CREATE INDEX "customer_shops_shop_id_idx" ON "customer_shops"("shop_id");

-- AddForeignKey
ALTER TABLE "customer_shops" ADD CONSTRAINT "customer_shops_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_shops" ADD CONSTRAINT "customer_shops_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
