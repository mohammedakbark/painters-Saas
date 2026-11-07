# Feature: Catalogue table

- **Feature ID:** CAT-003
- **Status:** Complete for the shop admin web (local verification; see §5)
- **Last updated:** 2026-11-06
- **Related modules:**
  - API `apps/api/src/shop-catalogue`: `pack-rows.ts`, `GET /v1/shops/{shopId}/catalogue/pack-rows`;
  - web: `app/shops/[shopId]/catalogue/page.tsx`, `components/ui/data-table.tsx`, `column-filter.tsx`, `filter-form.tsx`, `pagination.tsx`, `badge.tsx`;
  - tokens: `status.*Soft`;
  - Flutter: `AppBadge`.
- **Decisions:** D-029 (availability per pack), D-039 (shared components); owner request 2026-11-06

> **Replaced by CAT-006 (2026-11-07):** the list now shows one row per product (`product-rows`); `pack-rows` was removed. See `docs/features/CAT-006-product-list.md`.

## 1. Why

The catalogue listed products as tall cards with every pack inside. That doesn't work for 100+ products. Also, "Available" and "Unavailable" looked alike. The owner asked for:
- a table with pagination;
- a filter per column;
- separate tabs for litre products (paint) and kilogram products (putty);
- clearly different status colours.

## 2. Behaviour (shop admin web)

- **Rows:** one row per pack size, because price and availability belong to the pack.
- **Columns:** Product (sortable, links to the product), Brand, Category, Pack size, Price (with MRP; sortable), Availability, Action ("Mark available" / "Mark unavailable", owner only).
- **Tabs:** All · Litres (L, ml) · Kilograms (kg, g) · Pieces, each with a count. **Selling / Archived** stays.
- **Filters:**
  - a filter under each column heading: name search (Enter), brand, category, pack size, availability (All / Available / Not available);
  - the dropdowns show only values that exist in this shop and tab;
  - "Interior" and "Exterior" are categories, so the Category filter covers them; no new field was added;
  - filters live in the URL (shareable, survive reload, work without JavaScript); empty filters are left out of the URL;
  - **Clear filters** resets them.
- **Pages:** "Showing 26–50 of 132 pack sizes", page links, and 10 / 25 / 50 rows per page (default 25), sorted by name.
- **Phones:** the same table stacks. The filters become one panel and each row becomes a card with labelled values. No sideways scrolling.
- **States:**
  - the "No products yet" state stays;
  - "No pack sizes match these filters" offers **Clear filters**.
- **Status badges everywhere (web and Shop App):** filled soft colour plus a dot. Available is green; "Not available" (renamed from "Unavailable") is amber.

## 3. API

`GET /v1/shops/{shopId}/catalogue/pack-rows`
- **Query:** `tab`, `status`, `q`, `brand` (a key from `options.brands`), `categoryId`, `size` (`4:LITRE`), `available`, `sort` (`name`, `-name`, `price`, `-price`), `page`, `pageSize` (10, 25 or 50).
- **Returns:** `items`, `total`, `page`, `pageSize`, `tabCounts`, `options`.
- **Access:** shop-scoped like every catalogue route. A non-member gets 404, and another shop's packs never appear (e2e).
- **Implementation:** filtering, sorting and paging run in memory over the shop's products, because names, brands, categories and sizes come from either the shop's own fields or the brand catalogue. Revisit with a database query if a shop passes about 5,000 pack sizes.

## 4. Next (owner's order)

1. Platform admin web: the same table pattern for shops, reviews and the brand catalogue.
2. Shop App: a mobile pattern for the product list (search, filter sheet, chips, load more), not a table.
3. Customer App.

## 5. Checks (2026-11-06)

| Check | Result |
|---|---|
| API typecheck, lint; e2e `shop-catalogue` (18, including filters, tabs, sort, paging, validation and tenant isolation for `pack-rows`); OpenAPI exported | Passed |
| Tokens: soft status colours with AA contrast pairs; `tokens:check` | Passed |
| admin_web lint, typecheck, tests (DataTable, SortHeader, Pagination, page numbers, ColumnSelectFilter auto-submit, Badge colours), build; `ui:check` | Passed |
| Flutter format, analyze, tests (flutter_shared 69, including the badge colours; shop_app 70; customer_app 1) | Passed |
| Chrome, 25 local sample pack sizes (all tabs, every filter, page 2 at 10 per page, price sort, availability filter applied on change, search with Enter, Mark unavailable shows the amber badge, clean URLs), at 1280 px and 518 px; no horizontal scroll, no console errors | Verified |
