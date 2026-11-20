# CUS-006: Checkout and My Orders

- **Feature ID:** CUS-006
- **Status:** Complete (local; API e2e, Flutter tests). Not seen on a device (the emulator was stopped for low memory).
- **Last updated:** 2026-11-21
- **Related modules:** Customer App, API
- **Decisions:** D-045 (substitutes), D-046 (delivery charge), D-047 (customer cancel), D-049 (painters order for a site; delivery by map pin and radius), D-053 (steps, pay at pickup or delivery), D-059 (order of the ordering features), D-060 (follow the design), D-061 (saved delivery places; site spend in CUS-007)

## 1. Goal

A painter or customer turns their cart into an order with one shop, then follows it: steps, substitutes to answer, and cancelling while it is still early.

## 4. User flow

1. Cart → **Checkout** (only when today's prices are checked and nothing in the cart is unavailable).
2. Pickup or Delivery (Delivery is greyed out when the shop does not deliver).
3. **Painter:** choose one of their sites (required, D-049); "New site" opens the site form. Delivery goes to the site's address and pin.
   **Normal customer:** for delivery, choose a saved place or "New place" (name such as Home, address, map pin), which is saved and selected.
4. Payment: "Pay at pickup / delivery: cash, UPI or bank transfer. The shop records it." (D-053).
5. Items, delivery charge and total; **Place order · ₹…**.
6. Order placed → Track order or Keep shopping. The cart is cleared.
7. **My Orders** tab: orders from every shop, newest first, Load more, pull to refresh; "A substitute needs your answer" when one waits.
8. **Order page:** steps, the shop's substitute with Accept / Decline, items with their state (Not available, Replaced, Suggested, Declined) and the shop's note, totals, "Pay at…" or "Paid · method", **Cancel order** while New or Packing (with confirmation).

## 5. Business rules

- The server re-checks shop, packs, prices, delivery area and charge. Checkout sends the total it showed; any difference places nothing (`order_total_changed`) and the cart is re-checked with today's prices.
- A `clientRequestId` per checkout: a repeated or simultaneous request returns the same order (unique per shop, e2e).
- Painters must name an active site of their own; normal customers can't name a site. A delivery place or site of another person is refused.
- The painter's order stores the site (`orders.customer_site_id`) for site spend in CUS-007, plus the site name as `site_label`.
- Delivery charge and distance use the same rules on the phone (preview) and the server (`order-rules.ts`): flat charge, free from the free-above amount, within the radius of the shop pin.
- Saved places: up to 20 active per person, unique names (any case), archived not deleted (an assumption of this feature, like the 100-site cap in CUS-005).

## 6. UI requirements

All screens use shared components. New shared component: `AppProgressSteps` (Flutter counterpart of the web `ProgressSteps`). Loading, empty, error and not-found states on every screen.

## 6a. Design (D-060)

| Our screen | Design screen | Status |
|---|---|---|
| Checkout | Customer App › Checkout | Matches: radio cards, deliver to site / location, payment card, totals, Place order with the total. Differs: choices are full-width cards (one column) for long site names and 48 px targets |
| Order placed | Customer App › Order placed | Matches. Differs: the painter's "Added to site spend" line waits for CUS-007 |
| My Orders | Customer App › My Orders | Matches |
| Order page | Customer App › Order tracking | Matches: steps, substitute card, items, totals, Cancel. Differs: no product thumbnails (orders keep text snapshots only) |
| New delivery place | (none) | Follows Customer App › Sites form pattern (CUS-005) |

## 7. API contract

- `POST /v1/me/orders` `{shopId, fulfilment, siteId?, deliveryLocationId?, items[{shopProductPackId, quantity, shadeCode?, shadeName?}], expectedTotalPaise, clientRequestId}` → `{id, number}`. Errors: `site_required`, `site_not_found`, `site_not_allowed`, `delivery_location_required`, `delivery_location_not_found`, `order_total_changed`, `delivery_unavailable`, `delivery_out_of_range`, pack errors.
- `GET /v1/me/orders?page=` → `{items[{id, number, shop, placedAt, status, fulfilment, siteLabel, itemCount, totalPaise, needsAnswer}], page, hasMore}` (20 per page).
- `GET /v1/me/orders/{id}` → items, totals, payment, cancellation, `canCancel`. Never the shop's phone, staff or timeline.
- `POST /v1/me/orders/{id}/cancel` `{reason?}`; `POST /v1/me/orders/{id}/items/{itemId}/substitute` `{accept}`.
- `GET/POST /v1/me/delivery-locations`, `PATCH /{id}`, `POST /{id}/archive` (204).

## 8. Data model and migrations

Migration `20261120180000_cus_006_checkout`: table `customer_delivery_locations` (label 1–40, address 5–300, India pin, unique active label per person, RLS on); `orders.customer_site_id` (FK, only on app orders: CHECK) and `orders.client_request_id` (unique per shop); index `shop_customers(user_id)` for My Orders across shops.

## 9. Security and privacy

Every query is keyed by the signed-in person through `shop_customers.user_id`; another person's order, site or place is 404 (e2e). Audit: order placed, cancelled and substitute answered (existing actions); delivery place created, updated, archived (field names only, never the address or pin).

## 10. Acceptance criteria

- [x] A customer places pickup and delivery orders; the charge and area are checked.
- [x] A painter can't order without one of their sites.
- [x] A changed total places nothing; a repeated request never places twice.
- [x] My Orders lists orders from every shop; the order page shows steps, answers substitutes, cancels while New or Packing.
- [x] Nobody sees or changes another person's orders, sites or places.

## 11. Test plan (run)

API: 12 new e2e in `customer-orders.e2e-spec.ts` (all 220 e2e and 122 unit pass). Flutter: 9 new in `checkout_test.dart` (quote rules, request ids, pickup, delivery with far place refused, painter site required, changed total, My Orders, substitute and cancel); Customer App 47, shared 97, Shop App 183. `pnpm ui:check`, lint, typecheck, schema drift check.

## 12. Not included

- Site spend on Sites and the site page (CUS-007, D-061).
- Push notifications for order changes (postponed); orders update on pull to refresh.
- Editing or removing saved places from a settings screen (only add and choose at checkout; the API supports rename and archive).

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-21 | Implemented |
