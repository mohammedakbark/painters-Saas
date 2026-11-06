# Feature: One Add product flow

- **Feature ID:** CAT-005
- **Status:** Complete (local verification; see §4)
- **Last updated:** 2026-11-06
- **Related modules:**
  - API `shop-catalogue` (`brand-products` without a brand, the unit-group rule) and `catalogue-read.service.ts`;
  - web `app/shops/[shopId]/catalogue/new` (`add-product-flow.tsx`), `components/ui/combobox.tsx`, `components/shop-catalogue/shop-catalogue-forms.tsx` ("Sold by", photo), `catalogue/actions.ts`, `lib/shop-catalogue/forms.ts` (`applySoldBy`).
- **Decisions:** D-043; D-030 (brand catalogues), D-029

## 1. Why

Shops had two separate entry points, "Add from brand catalogue" and "Add your own product". The owner asked for one simple flow, used every time a product is added, not only during onboarding.

## 2. Behaviour

- **Products page:** one **Add product** button. While the shop has fewer than 10 products, **Quick start** (the CAT-004 bulk page) is offered beside it.
- **Search:** **Add product** opens one box, "Find the product". It searches every brand's catalogue from the second character typed (each result shows the brand, category and pack sizes); products the shop already sells are marked "In your products".
- **Picking a brand product:**
  - the name, brand, category and pack sizes are filled in and locked;
  - the shop ticks the pack sizes it sells, enters prices (MRP optional) and can add its own photo, then presses **Save product**;
  - if the shop already sells it, **Edit prices** is offered instead.
- **"Add '<typed>' as a new product"** (always the last option): the manual form, with
  - the name filled in from the search;
  - category (which covers interior / exterior);
  - brand from the list or typed;
  - **Sold by** (Litres, Kilograms or Pieces);
  - pack sizes as numbers (the unit comes from Sold by), with prices, MRP and availability;
  - description, "Customers choose a shade" and an optional photo.
- **After saving:**
  - the product page opens with "Product added";
  - if the photo could not be saved, the product is kept and the message says so.
- **Old links:** `add/[catalogueProductId]` now redirects to Add product.

## 3. Rules (API)

- **Search:** `GET brand-products` works without `brandId` when `q` has at least 2 characters (otherwise 400).
- **Sold by:** all pack sizes of an own product are in one unit group: litres and ml, kilograms and g, or pieces.
  - Creating a product with mixed groups is rejected (400).
  - Adding a pack size of another group is rejected (`pack_unit_group_mismatch`).
  - Brand-catalogue products are unchanged.

## 4. Checks (2026-11-06)

| Check | Result |
|---|---|
| API typecheck, lint; e2e `shop-catalogue` and `catalogue` (35, including the search across brands, the missing-search 400 and the unit-group rule on create and add-pack); OpenAPI exported | Passed |
| admin_web lint, typecheck, tests (Combobox search, keyboard and the "new product" option; Sold by unit labels; `applySoldBy`), build; `ui:check` | Passed |
| Chrome, test shop "Sree Colours": Products shows Quick start and Add product; "silk" finds the brand product, its details are locked and it saves with prices; "Asian Ace Primer" becomes a new product with the name filled in, Sold by Kilograms (the labels change to kg) and saves; an already-sold product offers Edit prices; 1280 px and 518 px; no console errors | Verified |
