# CUS-007: Site spend

- **Feature ID:** CUS-007
- **Status:** Complete (local; API e2e, Flutter tests). Not seen on a device (the emulator was stopped for low memory).
- **Last updated:** 2026-11-22
- **Related modules:** Customer App, API
- **Decisions:** D-008 (combined site spend, separate shop-wise detail), D-049 (painters order for a site), D-060 (follow the design), D-061 (site spend right after checkout)

## 1. Goal

A painter sees what each work site has cost so far across every shop they buy from, with each shop's orders kept separate.

## 4. User flow

1. **Sites tab:** each site card shows "Spent so far ₹…" and "N shops · N orders" (or "No orders yet"). Tapping a site opens its page; archived sites open it too.
2. **Site page:** "Total spent on this site" with shops and orders, then **By shop**: each shop's name and total, and its orders (number, date, step, total), newest first. An order opens the order page. Menu: **Edit site** (the CUS-005 form, which still has Archive). Empty state before the first order.
3. **Home (painters):** a card for the active site ordered for most recently: "Green Villa · ₹… so far", "N shops · tap to see each shop's orders". Hidden before the first site order and while sites load or fail.
4. **Order placed (painters):** "Added to <site>'s spend."

## 5. Business rules

- Spend = the sum of `orders.total_paise` for the painter's orders with `customer_site_id` = the site, from any shop, **cancelled orders left out**. Open orders (New to Out for delivery) count; the total already reflects not-available items, accepted substitutes and returns (ORD-001).
- Computed from orders on every read (grouped sums), never stored, so it can't drift.
- Only app orders count: a site the shop recorded (ORD-004, `ShopSite`) is not the painter's site until linking exists (later).
- Shops are listed by most recent order first. The page lists at most the latest 200 orders (an assumption of this feature to bound the response); the totals always cover every order, and the page says when the list is cut.
- Billing, payments and what is owed per shop are not part of this feature (Phase 3 billing); the page says so, as in the design.

## 6a. Design (D-060)

| Our screen | Design screen | Status |
|---|---|---|
| Sites | Customer App › Sites | Matches: name, place and owner, "Spent so far", number of shops. Differs: no Active badge (archived sites live on their own screen); "Add site" stays in the bottom bar (CUS-005) |
| Site page | Customer App › Site spend | Matches: dark total card (new shared `AppTotalBanner`), By shop with each shop's total and orders, the billing note. Differs: each order is its own tappable card under the shop's name, so it opens the order |
| Home site card | Customer App › Home (painter card) | Matches the text and tap. Differs: uses the standard `AppNavRow`, not the yellow tint (no accent-soft token yet) |
| Order placed | Customer App › Order placed | Matches: "Added to <site>'s spend." |

## 7. API contract

- `GET /v1/me/sites` and every site response now carry `spend {totalPaise, shopCount, orderCount, lastOrderAt}`.
- `GET /v1/me/sites/{siteId}/spend` → `{site {id, name, archived}, totalPaise, shops [{shop {id, name}, totalPaise, orderCount, orders [{id, number, placedAt, status, totalPaise}]}], ordersTruncated}`. Errors: 403 `painter_only`, 404 `site_not_found`.

No migration: it uses `orders.customer_site_id` and its index from CUS-006.

## 9. Security and privacy

Queries are keyed by the site's owner and by `shop_customers.user_id` of the order, so nobody sees another person's site spend (e2e: another painter gets 404, a normal customer 403, no token 401). The painter sees only their own orders' totals and the shop names, which they already see in My Orders; no shop data beyond that.

## 10. Acceptance criteria

- [x] Each site shows its spend across shops; cancelled orders are not counted.
- [x] The site page shows the total and each shop's total and orders separately.
- [x] Archived sites keep their spend.
- [x] A painter's Home shows their latest site's spend; Order placed says the order was added.
- [x] Spend refreshes after placing, cancelling or answering a substitute.
- [x] Nobody sees another person's site spend.

## 11. Test plan (run)

API: 2 new e2e in `customer-orders.e2e-spec.ts` (two shops, cancelled left out, shop order, archived keeps history; privacy). All 222 e2e and 122 unit pass; lint, typecheck, OpenAPI exported. Flutter: 6 new in `site_spend_test.dart`, `sites_test.dart` updated for the site page, `checkout_test.dart` checks the Order placed line; Customer App 53, shared 97, Shop App 183; `pnpm ui:check`.

## 12. Not included

- Bills, payments and balances per shop (Phase 3 billing, credit).
- Linking a painter's site with a site a shop recorded (D-055).
- Spend by date range or export.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-22 | Implemented |
