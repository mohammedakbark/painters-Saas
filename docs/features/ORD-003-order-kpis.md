# ORD-003: Order figures on the Overview

Status: **Complete (local; Chrome)**. Step B3 of the "Web first" roadmap; Step B (ordering on the server and shop web) is complete.

## Goal
The shop's first page shows how many orders need work and what was sold today.

## Owner's decision (2026-11-08)
**Today's sales** is the total of orders **completed today**, after not-available items and returns, whether paid or not.

## Behaviour (Overview, `/shops/{id}`)
- **Orders** section above Products, loading on its own (PERF-001), with four `StatTile`s (two per row on phones, four from 1200 px):
  - **New orders:** count, with an info "Needs attention" badge when more than 0. Opens the New tab.
  - **To pack:** orders in Packing. Opens the Packing tab.
  - **Ready or on the way:** ready for pickup plus out for delivery. Opens the Ready tab.
  - **Today's sales:** amount and "N orders completed today". Opens the Completed tab.
- **Unpaid line:** "₹X not yet paid on N orders" (orders that are ready, out for delivery or completed and unpaid), with a link to the unpaid list.
- **To do:** "N new orders are waiting." with **Open orders** comes first once setup is done and the shop is Live.
- "Today" is the **Indian calendar day** (Asia/Kolkata).

## API
`GET /v1/shops/:shopId/orders/summary` (shop members) returns:
- `new`, `packing`, `ready`;
- `unpaid { count, totalPaise }`;
- `today { placed, completed, salesPaise }`.

One SQL query scoped to the shop. Another shop's owner gets 404. The route is declared before `:orderId`.

## Components
`StatTile` now takes a ready text value (an amount) as well as a number. Long values wrap.

## Tests
- **API e2e** (`orders.e2e-spec.ts`):
  - steps, unpaid and today's figures with a not-available item, a return and a payment;
  - an order completed two days ago is not in today's sales;
  - another shop's orders are not counted, and another owner gets 404.
  - The full suite passes (145).
- **Web:** `stat-tile.test.tsx` (text value); the full web suite passes (238).
- **Chrome** (ABC PAINTS, 1280 and 518 px):
  - tiles, links and the unpaid line;
  - completing an order on the Orders page moved Ready from 5 to 4 and Today's sales from ₹29,400 to ₹37,250;
  - no horizontal scroll and no console errors.

## Limits
- The test orders from `orders:seed-test` were all completed on the day the script ran, so "Today's sales" is large that day.
- Figures update when the page loads; the Orders page has the 30-second check.
