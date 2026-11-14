# SHP-007: Orders in the Shop App

Status: **Complete (local; tests and the main path on the Android emulator against the real API)**. What was and wasn't tried on the emulator is in `docs/PROJECT_STATE.md` §6. First of three Shop App features chosen by the product owner on 2026-11-13: SHP-007 (this), SHP-009 (record phone and counter orders), NOT-001 (push notifications).

## Goal
The shop handles its orders from the phone with everything the web Orders page has (ORD-002), and sees today's order figures on the shop home. The API is ORD-001 unchanged.

## Shop home
- **Order figures** for a Live shop: New, To pack, Ready or on the way and Today's sales (orders completed today), with a line for orders not paid yet. Each tile opens the orders in that step.
- The figures load on their own; a failure shows a message with "Try again" and the rest of the home stays usable.
- A new **Orders** row sits above Products. The sentence "Orders will appear here when that feature is released" is gone.

## Orders list (`/shops/{id}/orders`)
- **Steps as chips with counts:** Open (the default), New, Packing, Ready, Completed, Cancelled, All. The row scrolls sideways. `?tab=` opens a step directly (used by the home tiles).
- **Search** by order number, customer name or mobile. **Filter** opens a bottom sheet: Pickup or Delivery, Unpaid or Paid, Clear filters. The button shows how many filters are on.
- **Order cards** (no tables on mobile):
  - number, status badge, time ("Today, 10:42 am", Indian time), pickup or delivery;
  - customer name, mobile, site;
  - total, item count, Paid or Unpaid, "N not available";
  - one next-step button (Start packing, Ready for pickup, Out for delivery, Mark completed). Cancel is never on a card.
- **Updates without reloading:**
  - a step shows "Saving…" on its own button, then only the list data and counts are read again;
  - pull down to refresh;
  - every 30 seconds while the screen is in front (not behind an order or a sheet, not in the background) it checks for new orders and says "2 new orders".
- **Load more** in pages of 25.
- **States:** loading, no orders yet, nothing in this step, nothing matches (with Clear filters), error with "Try again" (search and chips stay), shop not found.

## Order (`/shops/{id}/orders/{orderId}`)
- **Header:** number, status badge, pickup or delivery, time. The next step is the main button. **Cancel order** opens a sheet with the shop's ready messages or "Write my own"; the reason is required.
- **Items:** product, brand, pack, shade, quantity × price, amount. Lines that don't count are struck through, with a badge (Not available, Waiting for the customer, Replaced, Declined by the customer) and the message. Substitutes sit indented under the line they replace.
  - While the order is new or packing: **Not available** (ready message or own text) and **Suggest substitute** (search the shop's available pack sizes, quantity, optional shade code, message; the message is optional when the line already has one).
  - After completion the owner can **Record return** (units up to what is left, and a reason).
- **Totals:** items, delivery (or "Free") and total.
- **Customer:** name, "Orders in the app" or "This order was recorded by your shop", site, and a **Call** button that opens the phone app.
- **Pickup or delivery:** address, distance and **Open in maps** (the phone's map app); "No map pin for this address" for a typed address.
- **Payment:** Paid with the method and time, or **Record payment** (Cash, UPI, Bank transfer) for the owner once the order is ready. Other members read "The shop owner records the payment."
- **Timeline** in plain words, newest first.
- Every action shows its busy state on its own button, closes its sheet, confirms in a snack bar and replaces the order with what the API returned. If the order changed somewhere else meanwhile (409), the order is read again and the API's reason is shown.
- Pull down to read the order again. Another shop's order or a bad id shows "Order not found".

## Permissions and tenant safety
- The app sends only the shop id from the route; the API checks membership and that the order and item belong to the shop (ORD-001 e2e). Another shop's order answers 404 and the app shows "not found".
- Payments and returns are hidden unless the member is the owner **and** the API says the action is possible (`canRecordPayment`, `canReturnItems`). The API enforces the role either way; a 403 reads "Only the shop owner can do this."
- Nothing about orders is stored on the phone or written to logs.

## Code
- `apps/shop_app/lib/src/orders/`: `order_models.dart`, `order_labels.dart` (the web's words and colours), `shop_orders_repository.dart`, `order_providers.dart`.
- `apps/shop_app/lib/src/features/orders/`: `order_list_screen.dart`, `order_screen.dart`, `order_sheets.dart`, `order_messages.dart`.
- `providers.dart`: `shopOrdersRepositoryProvider`, `linkOpenerProvider`, `orderRefreshIntervalProvider`.
- New shared components (D-039) in `flutter_shared`: `AppChoiceChips` (scrolling chips with counts) and `AppStatTile` (a dashboard figure). They use existing component tokens.
- New package: `url_launcher` (phone and map links).

## Tests
- `test/orders_unit_test.dart` (20): models from JSON, pack options, labels and colours, next step, Indian times, timeline sentences, new-order counting, every API route and body, error mapping.
- `test/orders_test.dart` (22 widget tests): home figures and their links, not-Live shop, list with counts, steps, search, filters, next step, refused step, new-orders check, empty and error states, order page, call and map links, cancel needs a reason, not available, substitute, payment, return, staff restrictions, API refusal in a sheet, not found.
- `flutter_shared/test/order_components_test.dart` (3).

## Limits and follow-ups
- The mobile number on a list card is text; calling is on the order page.
- The 30-second check runs only while the Orders screen is open. Push notifications are NOT-001.
- Recording a phone or counter order in the app is SHP-009; until then it is on the web.
- The customer's answer to a substitute comes with the Customer App.
- iOS not built (needs macOS).
