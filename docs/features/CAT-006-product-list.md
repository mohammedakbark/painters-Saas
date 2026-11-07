# Feature: Product list (one row per product)

- **Feature ID:** CAT-006
- **Status:** Complete (local; see §4)
- **Last updated:** 2026-11-07
- **Related modules:**
  - API `apps/api/src/shop-catalogue/product-rows.ts`, `GET /v1/shops/{shopId}/catalogue/product-rows`;
  - web `app/shops/[shopId]/catalogue/page.tsx`, `row-actions.tsx`, `actions.ts` (`setProductAvailabilityAction`), `components/ui/thumbnail.tsx`, `pack-chip.tsx`.
- **Decisions:** D-029, D-039, D-043; owner request 2026-11-07

## 1. Why

The CAT-003 table had one row per pack size. Each product was repeated 3–4 times, a page showed only a few products, the filters were squeezed under the column headings, and there were no images. The owner asked for a clearer list with photos and easy actions.

## 2. Behaviour

**Rows:** one row per product.
- **Photo:** the shop's photo or the catalogue image, with a placeholder when there is none.
- **Product:** the name (opens the product), "Brand · Category", and "Own product" or "Removed from brand catalogue" badges.
- **Pack sizes and prices:** chips such as "4 L · ₹1,950", with a green dot when available or amber when not. Up to 4 are shown, then "+N more".
- **Availability:** "All available" (green), "2 of 4 available" (amber) or "Not available" (amber).
- **⋯ menu:** Edit prices and details; Mark all sizes available / not available (only what changes something); Archive (with confirmation) or Restore.

**Toolbar above the table:**
- search (Enter);
- Brand, Category, Pack size (products that have it);
- Availability: Fully available / Some sizes not available / Not available;
- Sort: Name A–Z / Lowest price / Highest price.

The Litres · Kilograms · Pieces tabs count products, and Selling / Archived stays. **Clear filters** appears when a filter is set, and the filters live in the URL.

**Pages and phones:** "Showing 1–25 of N products", 10/25/50 per page. On phones the rows stack into cards and the toolbar stacks.

## 3. API

`GET product-rows` replaces `pack-rows` (CAT-003), which nothing else used.
- **Query:** `tab`, `status`, `q`, `brand`, `categoryId`, `size`, `show` (all, available, partly, none), `sort` (name, price, -price), `page`, `pageSize`.
- **Rows:** the product, its `thumbUrl`, the packs in the current tab, `availableCount`, `packCount`, `minPricePaise`.
- A product appears in a tab when any of its pack sizes belongs to it.
- Shop-scoped as before: a non-member gets 404, and only the shop's products are listed.
- "Mark all" uses the existing pack update once per pack size.

## 4. Checks (2026-11-07)

| Check | Result |
|---|---|
| API typecheck, lint; e2e `shop-catalogue` (20, including each filter, `show`, tabs, sort, paging, validation and isolation for `product-rows`); OpenAPI exported | Passed |
| admin_web lint, typecheck, tests (216, including Thumbnail, PackChip, the row menu's "mark all"), build; `ui:check` | Passed |
| Chrome | See PROJECT_STATE log |
