-- CreateEnum
CREATE TYPE "shop_location_source" AS ENUM ('MAP_PIN', 'DEVICE_GPS');

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "address_line1" TEXT,
ADD COLUMN     "address_line2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "location_source" "shop_location_source",
ADD COLUMN     "location_updated_at" TIMESTAMPTZ(3),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "profile_updated_at" TIMESTAMPTZ(3),
ADD COLUMN     "state_code" TEXT,
ADD COLUMN     "support_phone" TEXT;

-- ---------------------------------------------------------------------------
-- Hand-written additions (SHP-003). Keep them in sync with the comments in
-- schema.prisma and with the API validation in src/shops/shop-profile.schemas.ts.
-- ---------------------------------------------------------------------------

-- Indian mobile numbers only (initial market, SHP-001 assumption).
ALTER TABLE "shops" ADD CONSTRAINT "shops_support_phone_check"
  CHECK ("support_phone" IS NULL OR "support_phone" ~ '^\+91[6-9][0-9]{9}$');

-- Address text is stored trimmed and within the API limits.
ALTER TABLE "shops" ADD CONSTRAINT "shops_address_text_check" CHECK (
  ("address_line1" IS NULL OR ("address_line1" = btrim("address_line1") AND char_length("address_line1") BETWEEN 1 AND 200)) AND
  ("address_line2" IS NULL OR ("address_line2" = btrim("address_line2") AND char_length("address_line2") BETWEEN 1 AND 200)) AND
  ("landmark"      IS NULL OR ("landmark"      = btrim("landmark")      AND char_length("landmark")      BETWEEN 1 AND 120)) AND
  ("city"          IS NULL OR ("city"          = btrim("city")          AND char_length("city")          BETWEEN 1 AND 80)) AND
  ("district"      IS NULL OR ("district"      = btrim("district")      AND char_length("district")      BETWEEN 1 AND 80))
);
ALTER TABLE "shops" ADD CONSTRAINT "shops_state_code_check"
  CHECK ("state_code" IS NULL OR "state_code" ~ '^[A-Z]{2}$');
ALTER TABLE "shops" ADD CONSTRAINT "shops_postal_code_check"
  CHECK ("postal_code" IS NULL OR "postal_code" ~ '^[1-9][0-9]{5}$');

-- The required address fields are set and cleared together (line 2 and landmark are optional).
ALTER TABLE "shops" ADD CONSTRAINT "shops_address_complete_check" CHECK (
  num_nonnulls("address_line1", "city", "district", "state_code", "postal_code") IN (0, 5) AND
  ("address_line1" IS NOT NULL OR ("address_line2" IS NULL AND "landmark" IS NULL))
);

-- Latitude, longitude, source and time are set together, inside India's bounding box.
ALTER TABLE "shops" ADD CONSTRAINT "shops_location_check" CHECK (
  num_nonnulls("latitude", "longitude", "location_source", "location_updated_at") IN (0, 4) AND
  ("latitude" IS NULL OR "latitude" BETWEEN 6 AND 38) AND
  ("longitude" IS NULL OR "longitude" BETWEEN 68 AND 98)
);
