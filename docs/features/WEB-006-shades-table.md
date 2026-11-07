# WEB-006: Shades as tables

Status: **Complete (local; Chrome)**. Step A1 of the "Web first" roadmap (PROJECT_STATE §7).

## Goal
The shop's Shades page uses the same table style as Products (CAT-006, D-039), so it stays usable with thousands of brand shades.

## Behaviour
- Tabs (`?view=`): **Favourites** (default), **Brand shades**, **My shades**.
- Each tab has a search box (code or name, Enter to search), a table and numbered pages (10, 25 or 50 per page). The search and paging state is kept in the URL.
- **Favourites:** swatch, code and name, brand; **Remove favourite**.
- **Brand shades:** a brand filter (first brand by default) and search. Each row shows the swatch, a **Favourite** badge when marked, and **Add to favourites** / **Remove favourite**.
- **My shades:** an "Add a shade of your own" form (code, name, optional screen colour and brand), then a table with **Remove**.
- Only the owner (MASTER) sees the actions; staff see the lists read-only.
- Static title and colour note, the tab content loads behind `Suspense` (PERF-001), each action shows its own busy state.
- Empty states: no favourites yet, no brand shades, no matches, no shades of your own.

## API
`GET /v1/shops/:shopId/catalogue/brand-shades`, `/favourite-shades` and `/shades` are page-based: `q`, `page` (≥ 1), `pageSize` (10, 25 or 50). They return `items`, `total`, `page` and `pageSize` (replacing the keyset cursor). Ordered by shade code. The shop comes from verified membership as before.

## Tests
- API e2e (`shop-catalogue.e2e-spec.ts`): totals, search, a page past the end is empty, `pageSize=7` is rejected.
- Chrome at 1280 px and 518 px: tabs, brand filter and search, add and remove a shade of your own, paging text, no horizontal scroll, no console errors.

## Limits
- The local database has no brand shades, so the brand table with rows and the favourite toggle were checked by API tests only.
