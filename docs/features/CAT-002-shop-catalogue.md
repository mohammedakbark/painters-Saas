# Feature: Shop catalogue

- **Feature ID:** CAT-002
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-04
- **Related modules:** API (`src/shop-catalogue/`), web portal (`/shops/[shopId]/catalogue/**`), onboarding checklist
- **Decisions:** D-029 (availability per pack size), D-030 (brand catalogues; shops' own products and shades; favourite shades), D-033 (products always editable), D-012 (10 products before review), ADR 0008 (catalogue model), ADR 0007 (images)

## 1. Problem and goal

A shop must list what it sells, with its own prices, before it can be reviewed (D-012). The owner picks products from the platform's brand catalogue (CAT-001) and enters prices per pack size. Products that aren't in the brand catalogue are added as the shop's own. Each pack size is marked available or unavailable (D-029). The owner also marks the brand shades the shop uses most and adds shade codes of its own (D-030).

## 2. User roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Shop master account (owner) | Add, edit, archive and restore products; set pack prices, MRPs and availability; add and remove pack sizes; upload a product photo; manage favourite and own shades | — |
| Other members of the shop (future staff roles, question 37) | Read the catalogue | Change it (403 `shop_permission_denied`; the web hides the forms) |
| Members of other shops, platform admins, anyone else | Nothing (404 `shop_not_found`, the same answer as for an unknown shop) | — |

## 3. Preconditions

- The shop exists and the caller is a member (SHP-001).
- The brand catalogue has active brands, categories and products (CAT-001). Locally, `pnpm --filter api catalogue:seed-sample` loads a fictional sample brand.

## 4. User flow (shop portal, **Catalogue**)

1. **Products** (default tab):
   - the shop's products, newest first, with each pack size, price (with MRP) and an Available/Unavailable badge;
   - **Mark unavailable / Mark available** per pack: the quick daily switch;
   - search by product or brand name; **Selling** / **Archived** filter; next-page link;
   - empty state that points to **Add from brand catalogue**.
2. **Add from brand catalogue:**
   - choose a brand (and optionally a product name), then **Choose** a product;
   - products the shop already sells show **In your catalogue** and **Edit prices** instead;
   - on the product: every pack size is ticked; untick sizes not sold, enter the MRP (optional) and price, and set availability; **Add to my catalogue**.
3. **Add your own product:**
   - name, category (the platform's categories), a catalogue brand or a typed brand name (or neither), description, "Customers choose a shade";
   - up to four pack rows ("4 L", MRP, price, available); more sizes can be added later.
4. **Product page:**
   - each pack size: MRP, price and availability with **Save**; **Remove** (not for the last pack size);
   - **Add a pack size**: one of the brand's sizes not yet sold, or a typed size for own products;
   - details: editable for own products; read-only for brand-catalogue products (they keep the catalogue's name, brand, category and description);
   - product photo: own products need the shop's own photo; brand products show the catalogue image unless the shop uploads one;
   - **Archive product** / **Restore product**.
5. **Shades** tab:
   - favourite shades (code, name, brand, indicative swatch) with **Remove**;
   - brand shades: choose a brand, search by code or name, **Add to favourites** / **Remove favourite**;
   - your own shades: code, name, optional screen colour and brand; list with **Remove**.
6. **Overview:** the onboarding checklist's **Products** item shows "N of 10 added" and links to the catalogue.

Failure paths:
- a price above the MRP, an unreadable amount or pack size, no ticked pack size, or a missing size or price in a filled row: field errors next to that row, values kept;
- a duplicate own product name (case-insensitive) or a pack size already listed: 409 with the clash named;
- a brand product that the platform has archived can't be newly added (400); an existing listing stays and shows **Removed from brand catalogue**;
- an unknown product (or one of another shop) shows **Product not found**; another shop's URL shows **Shop not found**.

## 5. Business rules

1. **Two kinds of listing** (ADR 0008):
   - *brand product*: links a brand-catalogue product, at most once per shop, and its packs link that product's pack sizes;
   - *own product*: the shop's own name (unique per shop regardless of case), a platform category and an optional brand (catalogue brand or typed name, not both); packs have typed sizes.
2. **Prices:** integer paise. The price is required and between ₹0.01 and ₹1 crore; the MRP is optional with the same limits. **The price may not be more than the MRP** (assumption: selling above MRP is not allowed for packaged goods in India; to confirm, see DECISIONS §3a).
3. **Availability** (D-029): a switch per pack size; unavailable packs are shown as unavailable and (later) can't be bought or added to a cart. Customer requests for unavailable items come with the Customer App.
4. **Pack sizes:** 1–12 per product, each listed once. A product always keeps at least one pack size (archive it to stop selling).
5. **Archiving, not deleting:** products are archived and restored. Pack sizes can be removed (no orders reference them yet; ordering features will restrict this).
6. **Brand catalogue changes:** the platform can't remove a pack size a shop sells (409 `pack_in_use`, CAT-001). Archiving a brand, category or product keeps shop listings, flagged as removed from the brand catalogue.
7. **Onboarding (D-012):** the **Products** item is done at **10 active products, each with at least one pack size**. Archived products don't count. The counting rule is an assumption (DECISIONS §3a).
8. **Shades:** favourites are active brand shades, at most 500 per shop, adding twice keeps one. Own shades: upper-case codes unique per shop (same pattern as brand shade cards), at most 1,000 per shop; they can be removed (nothing references them yet).
9. **Editing** (D-033): products and prices stay editable at any time, including while the shop is in review (PLT-002).
10. **Audit:** every change is audited with the product or shade id and field names or counts only. A pack save that changes nothing writes no audit event.

## 6. UI requirements

- Every page reads its data inside its own `<Suspense>` (`PageLoading`). Forms submit in a transition, so typed values, ticked boxes and selects survive a failed save.
- Money is typed in rupees (`1,450`, `₹1450.50`) and shown with Indian grouping (`₹1,23,456.78`) and tabular numerals.
- Status is always stated in words (Available/Unavailable, Archived, Own product, Removed from brand catalogue).
- Shade swatches are indicative; the code and name are always text, with the "Colours on screen are indicative only" note.
- Buttons in lists name their target for screen readers (for example "Mark Demo Matt Interior Emulsion 4 L unavailable").
- New components:
  - `PackPriceFields`, `CatalogueListingForm`, `OwnProductForm`, `PackRowForm`, `AddPackForm`, `ActionButtonForm`, `OwnShadeForm` (`components/shop-catalogue/`);
  - `ShadeSwatch` moved to `components/catalogue/shade-swatch.tsx` for reuse.
- `lib/money.ts` (`parseRupees`, `formatRupees`, `paiseToInput`); `lib/shop-catalogue/forms.ts` (row parsing).
- Shop navigation gains **Catalogue**.

## 7. API contract

All under `/v1/shops/:shopId/catalogue`, `@ShopScoped` (membership); writes need `CATALOGUE_MANAGER_ROLES` (MASTER).

- **Products:**
  - `GET products?q&status=ACTIVE|ARCHIVED&catalogueProductId&cursor&limit` (newest first; cursor by id);
  - `POST products`: `{source: 'catalogue', catalogueProductId, packs: [{cataloguePackId, mrpPaise?, pricePaise, available}]}` or `{source: 'own', name, categoryId, brandId?, brandName?, description?, supportsShades, packs: [{quantity, unit, mrpPaise?, pricePaise, available}]}`;
  - `GET`/`PATCH products/:productId` (`status`; own products also name, category, brand, description, supportsShades);
  - `PUT products/:productId/image` (multipart `image`);
  - `POST products/:productId/packs`; `PATCH`/`DELETE products/:productId/packs/:packId` (each returns the product).
- **Browsing the brand catalogue:**
  - `GET brand-products?brandId&q&categoryId&cursor&limit`: catalogue products with `listedProductId`;
  - `GET brand-shades?brandId&q&cursor&limit`: brand shades with `favourite`.
- **Shades:**
  - `GET favourite-shades?q&cursor&limit`; `PUT`/`DELETE favourite-shades/:shadeId` (idempotent; DELETE is 204);
  - `GET`/`POST shades`; `PATCH`/`DELETE shades/:shadeId` (DELETE is 204).
- **Product response (`ShopProduct`):** `source`, `name`, `brand {id|null, name}`, `category`, `description`, `supportsShades`, `status`, `catalogueActive`, `image` + `imageSource (shop|catalogue)`, `packs [{id, cataloguePackId, quantity, unit, label, mrpPaise, pricePaise, available}]`, `unlistedCataloguePacks`, timestamps.
- **Onboarding:** `GET /v1/shops/:shopId/onboarding` gains `{key: 'products', done, progress: {current, required: 10}}`.
- **Errors:**
  - 404: `shop_not_found`, `shop_product_not_found`, `shop_pack_not_found`, `shop_shade_not_found`, `shade_not_found`;
  - 400: `validation_failed`, `catalogue_product_unavailable`, `pack_not_in_product`, `pack_kind_mismatch`, `price_above_mrp`, `catalogue_listing_read_only`, `category_unavailable`, `brand_unavailable`, `image_*`;
  - 403: `shop_permission_denied`;
  - 409: `product_already_listed`, `own_product_exists`, `pack_exists`, `pack_limit`, `last_pack`, `favourite_limit`, `shop_shade_exists`, `shop_shade_limit`.

## 8. Data model and migrations

`20261104085512_cat_002_shop_catalogue`:
- **`shop_products`:** `shop_id`, `catalogue_product_id?` or the own fields (`custom_name`, `custom_name_key`, `category_id`, `brand_id?` / `custom_brand_name?`, `supports_shades`), `description?`, `status` (`ACTIVE|ARCHIVED`), `image_key?`.
  - Unique: `(shop_id, id)` (composite FK target), `(shop_id, catalogue_product_id)`, `(shop_id, custom_name_key)`.
  - CHECKs: exactly one kind of listing; trimmed texts with `custom_name_key = lower(custom_name)`; image key inside `shops/<shop>/products/<product>/image/`.
- **`shop_product_packs`:** `shop_id`, `shop_product_id`, `catalogue_pack_id?` or `quantity` + `unit`, `mrp_paise?`, `price_paise`, `available`.
  - **Composite FK `(shop_id, shop_product_id)` → `shop_products (shop_id, id)`:** a pack can never belong to another shop's product.
  - FK to `catalogue_packs` with `RESTRICT` (gives the platform's `pack_in_use`).
  - Unique per product: `catalogue_pack_id`, `(quantity, unit)`.
  - CHECKs: catalogue pack or own size; price 1..1,000,000,000 paise; `price <= mrp` when an MRP is given.
- **`shop_shades`:** `shop_id`, `brand_id?`, `code` (upper-case pattern), `name`, `preview_hex?`; unique `(shop_id, code)`.
- **`shop_favourite_shades`:** primary key `(shop_id, shade_id)`.
- RLS enabled on all four tables; all foreign keys `RESTRICT`. Drift check: no difference.

## 9. Security and privacy

- **Tenant isolation:**
  - every query filters on the guard-resolved `shopId`;
  - product, pack and shade ids of another shop answer 404 like unknown ids;
  - the composite FK enforces it in the database too;
  - e2e tests use two shops for every read and write route, including a pack id of shop A on shop B's own product.
- **Writes:** MASTER only (`requireShopRole`), re-checked by the API on every call; the web hides forms from other roles.
- **Concurrency:** pack additions and removals lock the product row (`SELECT … FOR UPDATE`), so concurrent requests can't exceed 12 pack sizes or remove the last one.
- **Data:** no personal data. Prices are business data; audit metadata holds field names and counts only.
- **Product photos:** the ADR 0007 pipeline (re-encoded, metadata removed), stored under the shop's own key prefix.

## 10. Acceptance criteria

- [x] The owner can add a brand-catalogue product with chosen pack sizes, prices (MRP optional) and availability, and can't add it twice.
- [x] The owner can add an own product with a platform category, an optional brand and typed pack sizes; duplicate names (any case) are refused.
- [x] A price above the MRP is refused with a field error, in the form and in the API.
- [x] Pack sizes can be added, priced, switched available/unavailable and removed, keeping at least one.
- [x] Products can be archived and restored; archived products are listed separately and don't count for onboarding.
- [x] Favourite brand shades and own shades can be added and removed.
- [x] The onboarding checklist shows the product count and is done at 10 active products with a pack size.
- [x] One shop can't read or change another shop's products, packs or shades (tested both ways), and non-members get 404.
- [x] The platform can't remove a brand pack size that a shop sells (409 `pack_in_use`).

## 11. Test plan

- **API e2e (17 new):**
  - adding a catalogue product with audit; refusing duplicates;
  - price above MRP; foreign packs; archived catalogue products;
  - read-only catalogue fields; `catalogueActive`;
  - brand browsing with `listedProductId`; `pack_in_use`;
  - own products: normalisation, case-insensitive names per shop, brand/category validation;
  - rename/rebrand/archive/restore with audit field names;
  - list newest first with a cursor; search by name and brand;
  - product photo key;
  - packs: add, duplicate, wrong kind, price above MRP, availability, removal, audit of changed fields only, last pack;
  - tenant isolation (two shops, every route); 401 without a token;
  - favourites (idempotent, browse flag, archived shade); own shades;
  - onboarding count.
- **API e2e, CAT-001 fix (1 new):** shade search keeps the filter on later pages.
- **Web (18 new):**
  - rupee parsing and formatting;
  - pack row parsing (prices, MRP rule, ticked packs, own rows, duplicates);
  - `allValues`;
  - the forms (default ticks, values kept after errors, read-only mode, saved status, add-pack kinds, accessible button names);
  - the checklist's product progress.
- **Manual:** Chrome; see §13.

## 12. Dependencies and open questions

- **Price ≤ MRP** and the **10-product counting rule** are assumptions (DECISIONS §3a); the product owner should confirm both.
- **Customer requests** for unavailable items and owner notifications (D-029) come with the Customer App and notifications.
- **Painter discounts and commission** (D-031) come in the billing and commission phases.
- **The Shop App catalogue screens** come later; the API is ready for them.
- **Staff roles** (question 37) decide who besides the master may edit the catalogue.
- **Tinting** (question 52) is still open: products only record "customers choose a shade".
- **Next feature:** PLT-002 (review workflow) uses the products checklist item.

## 13. Implementation notes

**API (`src/shop-catalogue/`):**
- `shop-catalogue.schemas.ts`, `shop-catalogue-rules.ts` (limits, `ONBOARDING_MIN_PRODUCTS`), `shop-catalogue-mapping.ts`;
- `shop-products.service.ts`, `shop-shades.service.ts`, `shop-catalogue.controller.ts`, `shop-catalogue.module.ts`.

**Shared changes:**
- `CATALOGUE_MANAGER_ROLES` in `shop-access/shop-roles.ts`;
- `changedFields` moved to `audit/audit.ts` and `blankToNull` to `catalogue/catalogue-text.ts` (shared with CAT-001);
- the onboarding check in `ShopProfileService`.

**Web:**
- `src/app/shops/[shopId]/catalogue/` (products, `add`, `add/[catalogueProductId]`, `new`, `products/[productId]`, `shades`, `actions.ts`, `catalogue-parts.tsx`, `not-found.tsx`);
- `src/components/shop-catalogue/*`;
- `src/lib/api/shop-catalogue.ts`, `src/lib/api/or-not-found.ts`, `src/lib/money.ts`, `src/lib/shop-catalogue/forms.ts`;
- `apiRequest` accepts 204 responses (`z.undefined()`).

**CAT-001 fix found while building this:** the shade list combined the search and the page cursor as two `OR` keys in one object, so page 2 of a shade search dropped the search. They are now combined with `AND` (test added).

**Found and fixed in Chrome:**
1. `listCatalogueBrands` asked for 100 brands but the catalogue API caps lists at 50 (400): it now follows the cursor, 50 per page.
2. The pack row's "Saved." status never showed because the row remounted after each save; the remount key was removed.
3. Pack fields were cramped in the half-width card: rows now use two columns.
4. "Find shades" and similar buttons wrapped; they no longer shrink.
5. An unknown product said "Shop not found"; the catalogue now has its own "Product not found" page.
6. The favourite button in the brand list now says "Remove favourite" instead of a bare "Remove".

**Verified locally (2026-11-04):**
- **Chrome** (this computer's Chrome, signed in as the local test owner of Lakshmi Paints):
  - empty catalogue;
  - checklist shows "0 of 10", then "2 of 10 added";
  - brand browser;
  - pricing form: price above MRP shows a field error with values and ticks kept; then added (stored as paise, 10 L without MRP, 20 L not listed);
  - pack availability, price save ("Saved."), removal and adding 20 L back;
  - own product: brand clash and "4 gallons" errors, then added;
  - quick availability toggle; search;
  - favourites and own shade (code stored upper case);
  - product photo (key under the shop prefix);
  - archive (moves to Archived);
  - another shop's URL gives "Shop not found"; an unknown product gives "Product not found";
  - audit rows hold only field names and counts;
  - no console errors.
- **Dev server note:** after changing which names a shared module exports, `next dev` kept the old module in memory ("… is not a function") until restarted.

The full check list is in `docs/PROJECT_STATE.md` §6.

**Not verified:** a non-master member's read-only view (no staff roles exist yet; covered by component tests and the API role check); the Shop App (no changes).

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-04 | Specification and implementation (D-029, D-030, ADR 0008) |
