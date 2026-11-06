# Feature: Quick add for the first products

- **Feature ID:** CAT-004
- **Status:** Complete (local verification; see §3)
- **Last updated:** 2026-11-06
- **Related modules:** `apps/admin_web`: `app/shops/[shopId]/catalogue/add/page.tsx`, `add/quick-add-form.tsx`, `catalogue/actions.ts` (`addCatalogueProductsAction`), `lib/shop-catalogue/forms.ts` (`parseQuickAdd`), `catalogue/page.tsx` (added message)
- **Decisions:** D-012 (10 products before review), D-029 (availability per pack); owner guidance 2026-11-06 (FEATURE_CATALOG §4)

> **Entry point changed in CAT-005 (D-043):** products are added through one Add product flow; see `docs/features/CAT-005-add-product.md`. This page is now "Quick start".

## 1. Why

Adding a product used to take a separate page per product: choose it, tick its pack sizes, enter prices, save, and go back. Reaching the 10 products needed for review took more than 10 round trips.

## 2. Behaviour

**"Add from brand catalogue"** is one page per brand (with the same brand and name filters):
- **Progress card:** while the shop has fewer than 10 products it shows "4 of 10 products added", a progress bar and why it matters.
- **Products not yet in the shop:** each shows a price and an optional MRP for every pack size. **A price entered means the pack size is sold** (available); empty pack sizes and products are skipped.
- **Sticky bar:** it counts what is ready ("3 products, 4 pack sizes ready to add") and offers **Add 3 products**.
- **Checks before adding:** every field is checked first (rupee amounts, price not above MRP). If any is wrong, nothing is added and the errors show next to the fields with the typed prices kept. With nothing filled, it says "Enter a price for at least one pack size."
- **After adding:** products are added one by one through the existing API (owner role and shop checks unchanged). On success the page goes to Products with "N products added". If the API refuses some products, they are named and the others stay added.
- **Products already in the shop** are listed under "Already in your catalogue" with **Edit prices**.
- The single-product page (`add/[catalogueProductId]`) still exists for direct links.

No API, data or rule change.

## 3. Checks (2026-11-06)

| Check | Result |
|---|---|
| admin_web lint, typecheck, tests (`parseQuickAdd`: skips empty, rupees, price above MRP, nothing filled; form: counter, errors next to fields with values kept), build; `ui:check` | Passed |
| Chrome, a new local test shop (test number 3): 0 of 10 shown; price above MRP shows the error and adds nothing; 3 products with 4 pack sizes added in one submit; redirect with "3 products added"; progress 3 of 10, then 6 of 10 after the phone run; 1280 px and 518 px; no horizontal scroll, no console errors | Verified |
