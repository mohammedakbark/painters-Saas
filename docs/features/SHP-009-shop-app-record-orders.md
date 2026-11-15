# SHP-009: Record phone and counter orders in the Shop App

Status: **Complete (local; tests and a counter sale on the Android emulator against the real API)**. What was tried on the emulator is in `docs/PROJECT_STATE.md` §6. Second of the three Shop App features chosen by the product owner on 2026-11-13 (SHP-007, SHP-009, NOT-001).

## Goal
A shop member records an order for someone who phoned or is at the counter, from the phone, with the same rules as the web's New order page (ORD-004, D-054, D-055). The API is unchanged.

## Where
- **New order** button fixed at the bottom of the Orders screen, for Live shops only (the API refuses other shops anyway).
- Screen `/shops/{id}/orders/new`, one page in four steps.

## Steps
1. **Customer**
   - Search the shop's customers by name or mobile (at least 2 letters); tap a result to choose it. The card then shows the name, Painter or Customer, the mobile and **Change customer**.
   - **Add customer** opens a bottom sheet: name, mobile (+91, any common format, checked as an Indian mobile), Painter or Customer. The sheet says only the shop sees the customer and no SMS is sent. A mobile the shop already has shows the API's message on the field. The new customer is chosen straight away.
   - **Site (optional)** for a painter the shop recorded, from their active sites. With no sites: "No sites yet. Add this painter's sites on the web portal."
2. **Items**
   - Search the shop's products; only available pack sizes are listed, at today's price. Tap to add; adding the same pack again adds one more.
   - Each line: quantity (1 to 999), optional shade code, amount, **Remove**. Items total below.
3. **Pickup or delivery**
   - Pickup at the shop, or Delivery. With delivery off in Shop settings a warning says so (the API refuses the order).
   - Delivery address, up to 300 characters. With a site chosen it may stay empty to deliver to the site's address.
4. **Save**
   - Items, delivery charge (the shop's flat charge, or "Free" from the free-delivery amount) and total. The charge shown is a preview; the API fixes it when the order is saved.
   - **Paid by** (owner only): Not paid yet, Cash, UPI or Bank transfer. It is sent only with "Handed over now" (D-053).
   - **Save as new order** (goes through packing as usual) or **Handed over now** (saved as completed, for counter sales). Each button shows its own "Saving…".
   - After saving, the order opens with "Order saved"; the orders list and home figures read again in the background.

## Checks and errors
- Before sending: customer chosen, at least one item, at most 50, every quantity from 1 to 999, a delivery address or a site. Problems show at their step and together above the save buttons under "Not saved".
- API refusals (a pack that just became unavailable, delivery off, shop not Live, another shop's customer, site or pack) show the API's sentence under "Not saved" and nothing is lost from the form.

## Permissions and tenant safety
- Every member may record customers and orders; only the owner sees "Paid by", and the API enforces it (`ORDER_MANAGER_ROLES`).
- The app sends the shop id from the route and the ids it read from this shop. The API checks that the customer, site and packs belong to the shop (ORD-004 e2e), so another shop's ids answer 404.
- Customers recorded here stay private to the shop (D-054). Nothing is stored on the phone or logged.

## Code
- `apps/shop_app/lib/src/customers/`: `customer_models.dart`, `shop_customers_repository.dart` (search, read, create).
- `apps/shop_app/lib/src/orders/order_draft.dart`: draft lines, total, checks, delivery charge preview and the request body (the web's `customer-forms.ts` rules).
- `shop_orders_repository.dart`: `record` and `deliverySettings`.
- `apps/shop_app/lib/src/features/orders/new_order_screen.dart`.
- `flutter_shared`: `AppTextField` takes `maxLines` (the address).

## Tests
- `test/new_order_test.dart` (16): draft total and checks, site address rule, delivery charge, request body, active sites only, customer and order routes; widget tests for the Live-only button, missing fields, a delivery to a painter's site, adding a customer (invalid and duplicate mobile) with a paid counter sale, staff without "Paid by", removing a line and an API refusal, delivery off and no address.
- Shop App total 127; shared components 72.

## Limits and follow-ups
- The Customers list, the customer page, editing customers and adding or editing sites stay on the web.
- A shade is typed as a code; choosing from shade cards comes with the Customer App checkout.
- Push notifications are NOT-001.
