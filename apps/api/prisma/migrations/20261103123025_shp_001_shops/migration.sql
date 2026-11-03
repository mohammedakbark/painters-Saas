-- CreateEnum
CREATE TYPE "shop_status" AS ENUM ('DRAFT');

-- CreateEnum
CREATE TYPE "shop_role" AS ENUM ('MASTER');

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "shop_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_memberships" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "shop_role" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_memberships_user_id_idx" ON "shop_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_memberships_shop_id_user_id_key" ON "shop_memberships"("shop_id", "user_id");

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_memberships" ADD CONSTRAINT "shop_memberships_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_memberships" ADD CONSTRAINT "shop_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written additions (not expressible in schema.prisma). Keep them in sync
-- with the comments in schema.prisma.
-- ---------------------------------------------------------------------------

-- Shop names are stored trimmed, 2–120 characters.
ALTER TABLE "shops" ADD CONSTRAINT "shops_name_check" CHECK ("name" = btrim("name") AND char_length("name") BETWEEN 2 AND 120);

-- The protected master account: exactly one MASTER membership per shop.
CREATE UNIQUE INDEX "shop_memberships_one_master_per_shop" ON "shop_memberships" ("shop_id") WHERE "role" = 'MASTER';

-- Defense in depth (ADR 0005): RLS with no policies; the API is the table owner.
ALTER TABLE "shops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shop_memberships" ENABLE ROW LEVEL SECURITY;
