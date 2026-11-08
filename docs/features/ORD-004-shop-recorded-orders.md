# ORD-004: Customers, sites and orders recorded by the shop

Status: **Complete (local; Chrome)**. Decisions D-054 and D-055.

## Goal
Shops take many orders by phone or at the counter from people who don't use the app. The shop records these customers by mobile number, a painter's sites, and their orders, so the order list, the dashboard and later the bills are complete.

## Rules
- **Private to the shop (D-054):**
  - a recorded customer, their sites and orders are visible only to that shop;
  - the person isn't told and no SMS is sent;
  - they're shared only if the person later asks the shop to connect and confirms with an OTP (built with the Customer App).
- **Separate records (D-055):** if the mobile number already orders from this shop through the app, the shop's record stays separate. Nothing is added to the person's app account, and app orders keep working. One shop record per mobile per shop; the app-linked record can exist beside it.
- **Type (D-055):** the shop marks each recorded customer **Painter** or **Customer**. Sites are only for painters the shop recorded; painters who use the app keep their own sites.
- **Sites (D-055):** name and address or place are required; the owner name and map pin are optional. At most 50 active sites per customer; archive and restore.
- **Orders (D-055):**
  - **Save as new order** (goes through packing as usual) or **Handed over now** (saved as completed).
  - "Paid by" with a counter sale is owner only (D-053).
  - Current prices, only available packs, and only Live shops, as for app orders.
  - The delivery charge follows Shop settings. There's no distance limit because the shop delivers itself. The site's pin gives the distance when the order goes to the site.
- **Who:** every shop member may record customers, sites and orders.
- **Audit:** field names only, never names, numbers or addresses.

## Data (`ord_004_shop_records`)
- **`shop_customers`:** `kind` (PAINTER | CUSTOMER). The unique mobile is now a partial index for shop records (`user_id IS NULL`).
- **`shop_sites`:** customer (composite FK), name, owner, address, optional pin, `archived_at`; active names unique per customer; CHECKs; RLS.
- **`orders`:** `source` (APP | SHOP), `site_id` (composite FK), `created_by_user_id` (CHECK: set exactly for SHOP). The delivery CHECK lets shop-recorded deliveries go without a map point.

## API
- **`/v1/shops/:shopId/customers`:**
  - `GET` (search by name or mobile, type filter, pages; sites and orders counts, last order);
  - `POST` (409 `customer_phone_taken`, 400 `phone_invalid`);
  - `GET /:customerId` with sites;
  - `PATCH /:customerId` (the mobile only for shop records: 409 `customer_phone_from_app`);
  - `POST /:customerId/sites` (409 `sites_for_painters_only`, `site_name_taken`, `site_limit`);
  - `PATCH /:customerId/sites/:siteId` (edit, archive, restore).
- **`POST /v1/shops/:shopId/orders`:** `{customerId, siteId?, fulfilment, deliveryAddress?, items, handedOver, paymentMethod?}`. Returns the order detail; the timeline starts with `recorded`.
- **Order lists and details** include `source`; the list takes a `customerId` filter. Shared building steps live in `order-building.ts` (used by app orders too).

## Web
- **Customers** in the menu: a table (name and mobile, Painter or Customer, "Uses the app" or "Recorded by you", orders and last order, sites), search, type filter and pages. **Add customer** is a side sheet; a duplicate mobile names the existing customer.
- **Customer page:**
  - Painter or Customer badge, mobile (tap to call), the latest orders, **Edit** and **New order**;
  - **Sites** (painters the shop recorded): one add/edit sheet with an optional OpenStreetMap pin, using the shop's map picker moved to `components/maps` with site wording; archive and restore.
- **New order** (`/orders/new`, also from the Orders page and the customer page):
  1. customer (search, or **Add customer** in a sheet, which selects them straight away);
  2. site;
  3. items (search available packs at today's price; quantity, shade code, remove; running total);
  4. pickup or delivery (the site's address unless typed);
  5. "Paid by" (owner) and **Save as new order** or **Handed over now**.

  After saving, it opens the order with "Order saved".
- The order page says "This order was recorded by your shop" and shows "No map pin for this address" when there's no pin.

## Tests
- **API e2e:**
  - `customers.e2e-spec.ts` (9): recording, duplicate and invalid mobiles, edits, audit without personal values, separate app and shop records, search and filters, sites (painters only, unique names, archive and restore, 50 limit), phone order with site and delivery charge, counter sale handed over and paid, typed address without a pin, refusals (unavailable pack, other shop's customer, site or pack, archived site, shop not Live), tenant isolation on every route, malformed ids;
  - the full suite passes (154).
- **Web:** `lib/customers/customer-forms.test.ts` (site form, draft total and checks); the full suite passes (241).
- **Chrome** (ABC PAINTS, 1280 and 518 px):
  - added a painter and a site; the map loads in the sheet;
  - recorded a delivery order to the site (#1029, New) and a counter sale handed over and paid by UPI (#1030);
  - the customer page lists both;
  - no horizontal scroll and no console errors.

## Limits
- Connecting a shop record to the person's app account (OTP) comes with the Customer App.
- Customers are not deleted; sites are archived.
- Adding a site from the New order page links to the customer page.
