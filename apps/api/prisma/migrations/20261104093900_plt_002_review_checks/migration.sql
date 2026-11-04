-- Hand-written constraints (PLT-002). A separate migration: Postgres allows
-- the new shop_status values only after the migration that adds them commits.
-- Keep in sync with src/shop-review/.

-- An open review has no decision; a decided one has who and when, and is no
-- longer "open" (open_shop_id is the one-open-review-per-shop key).
ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_open_check" CHECK (
  ("decision" IS NULL) = ("open_shop_id" IS NOT NULL)
  AND ("open_shop_id" IS NULL OR "open_shop_id" = "shop_id")
  AND ("decision" IS NULL) = ("decided_at" IS NULL)
  AND ("decision" IS NULL) = ("decided_by_user_id" IS NULL)
);

ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_submitted_from_check" CHECK (
  "submitted_from" IN ('DRAFT', 'CHANGES_REQUESTED')
);

-- Reasons only (and at least one) when changes are requested; OTHER needs a
-- note; notes only on decisions by the platform.
ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_reasons_check" CHECK (
  "reasons" IS NOT NULL
  AND CASE
    WHEN "decision" = 'CHANGES_REQUESTED' THEN cardinality("reasons") > 0
    ELSE cardinality("reasons") = 0
  END
  AND (NOT ('OTHER' = ANY ("reasons")) OR "note" IS NOT NULL)
);

ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_note_check" CHECK (
  "note" IS NULL
  OR (
    "decision" IN ('APPROVED', 'CHANGES_REQUESTED')
    AND "note" = btrim("note")
    AND char_length("note") BETWEEN 1 AND 1000
  )
);
