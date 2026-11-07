-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "delivery_charge_paise" INTEGER,
ADD COLUMN     "delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "delivery_radius_km" INTEGER,
ADD COLUMN     "free_delivery_above_paise" INTEGER,
ADD COLUMN     "order_messages" TEXT[] DEFAULT ARRAY['Stock not available.', 'Stock can be arranged by tomorrow morning.']::TEXT[],
ADD COLUMN     "settings_updated_at" TIMESTAMPTZ(3);
