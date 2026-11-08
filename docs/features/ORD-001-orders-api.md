# ORD-001: Orders data and shop orders API

Status: **Complete (local; API and e2e)**. Step B1 of the "Web first" roadmap. The shop Orders page is ORD-002; order figures on the dashboard are ORD-003; orders recorded by the shop are ORD-004.

## Goal
Store orders safely and give the shop everything it needs to handle them: list, detail, steps, items not available, substitutes, payment and returns. A script creates realistic test orders so the web pages can be built before the Customer App.

## Rules (D-045 to D-047, D-049, D-053, D-054)
- **Ownership:**
  - every order belongs to one shop and one **shop customer**, the shop's own record of the person (D-054);
  - app orders link that record to the app account;
  - other shops never see it.
- **Accepted automatically** (D-045). Five steps (D-053):
  - **New** → **Packing**;
  - Packing → **Ready for pickup** (pickup orders) or **Out for delivery** (delivery orders);
  - Ready for pickup or Out for delivery → **Completed**;
  - plus **Cancelled**. The shop can cancel while the order is new or packing, with a reason. The customer can cancel until the order is ready or dispatched (D-047).
- **Items** (while the order is new or packing):
  - mark an item **Not available** with a message (one of the shop's order messages or its own text). It no longer counts towards the total.
  - **Suggest a substitute:** another pack size, shade or product of this shop that is available. It is a new line at its current price and counts only after the customer accepts; the original line then shows "Substituted". One open suggestion per item.
  - Notifying the customer: the message is stored on the line and in the timeline. Push notifications come with the apps.
- **Delivery** (D-046, D-049):
  - pickup is always possible;
  - delivery needs the shop's delivery on and the drop point within the shop's km radius of its map pin (great-circle distance);
  - the flat charge applies, or nothing from the free-delivery amount;
  - **the charge is fixed when the order is placed**, so a missing item never raises it.
- **Payment** (D-053): the customer pays at pickup or delivery. The owner records **Cash, UPI or Bank transfer** once the order is ready, out for delivery or completed, and only once.
- **Returns** (D-047): the owner records returned units of a completed order with a reason, and the total is adjusted. Refunds and bills follow with billing (Phase 3).
- **Roles:**
  - every member works on orders (`ORDER_ROLES`);
  - payments and returns are master only (`ORDER_MANAGER_ROLES`);
  - today MASTER is the only role.
- **Order numbers** run per shop from #1001, taken under a lock on the shop row.

## Data (`20261108054855_ord_001_orders`)
- **`shop_customers`:** shop, optional app user, name and phone (E.164); unique per shop by phone and by user. A shop-recorded customer with the same mobile is never linked automatically. Linking needs the person to ask and confirm with an OTP (ORD-004). Until then, an app order from that number answers 409 `customer_link_needed`.
- **`orders`:**
  - number, customer, a `site_label` placeholder until sites exist, fulfilment, status;
  - a delivery snapshot (address, point, distance);
  - totals in paise (CHECK: total = items + delivery);
  - payment, cancellation and the time of each step.
- **`order_items`:** a snapshot of product, brand, pack, shade and unit price; quantity 1 to 999; returned quantity; status (OK, NOT_AVAILABLE, SUBSTITUTED, SUBSTITUTE_OFFERED, SUBSTITUTE_DECLINED); note; substitute link. The pack link is set to null if a pack size is removed later.
- **`order_events`:** an append-only timeline (trigger), holding ids, statuses and the shop's reasons. Audit events hold no free text.
- **Integrity:**
  - children use composite `(shop_id, id)` foreign keys;
  - CHECKs for totals, delivery fields, payment, cancellation and text lengths;
  - RLS is on with no policies.

## API (`/v1/shops/:shopId/orders`, shop members)
| Route | What it does |
|---|---|
| `GET /` | Newest first. `status` (all, open or a status), `q` (order number, customer name or mobile), `fulfilment`, `payment`, `page`, `pageSize` 10/25/50. Returns counts per status tab, with filters applied. |
| `GET /:orderId` | Items, totals, payment, cancellation, `nextSteps`, `canEditItems`, `canRecordPayment`, `canReturnItems`, timeline. |
| `POST /:orderId/status` | `{to, reason?}`. A wrong step gives 409 `order_status_invalid`. |
| `POST /:orderId/items/:itemId/not-available` | `{message}` |
| `POST /:orderId/items/:itemId/substitute` | `{shopProductPackId, quantity, shadeCode?, shadeName?, message?}` |
| `POST /:orderId/payment` | `{method}`, owner only |
| `POST /:orderId/items/:itemId/return` | `{quantity, reason}`, owner only |

- Another shop's order, an item of another order and a malformed id all answer 404.
- There are no customer routes yet. `OrderPlacementService` (place, customer cancel, answer a substitute) is used by the script and tests, and the Customer App will reuse it.

## Test orders
`pnpm --filter api orders:seed-test [shopId]` (local only, refuses in production):
- creates 25 orders for the first Live shop with available packs, in every step;
- includes pickup and delivery, paid and unpaid, a not-available item, an accepted substitute and a return;
- uses test customers +91 90000 000xx, who can't sign in;
- runs once per shop.

## Tests
- **Unit** (`order-rules.spec.ts`): the step table, customer cancel, totals, delivery charge, distance.
- **e2e** (`orders.e2e-spec.ts`, 12 tests):
  - placing: price snapshot, per-shop numbers, delivery charge and free threshold, out of range, unavailable or other shop's packs, shop not Live;
  - steps for pickup and delivery; cancel rules; two simultaneous changes give one success;
  - not available; substitute and acceptance; payment rules; returns and totals; the audit log holds no reason text;
  - list filters, search, counts and paging;
  - **tenant isolation:** another owner gets 404 on every route, both through their own shop id and through this shop's id, and nothing changes; a substitute can't use another shop's pack; malformed ids get 404;
  - the timeline is append-only.

## Limits and follow-ups
- The shade on a line is a text snapshot, not checked against shade cards. The Customer App's checkout will check it.
- Placed times of test orders are spread over two weeks; their timeline entries keep the time the script ran.
- Push notifications, customer routes, sites (D-049) and shop-recorded orders (ORD-004, D-054) come later.
