# ORD-002: Shop Orders page (web)

Status: **Complete (local; Chrome)**. Step B2 of the "Web first" roadmap. It builds on the ORD-001 API.

## Owner's choices (2026-11-08)
- **Status colours:** New blue, Packing amber, Ready for pickup and Out for delivery green, Completed grey, Cancelled red. Red is the new `error` Badge tone.
- **Rows:** each open row has a one-click next-step button.
- **New orders:** the list checks every 30 seconds without reloading the page and shows a toast like "2 new orders".

## Orders list (`/shops/{id}/orders`, "Orders" in the menu)
- **Tabs with counts:**
  - Open (the default: new, packing, ready and out for delivery);
  - New, Packing;
  - Ready (ready for pickup and out for delivery, from the API's `status=ready`);
  - Completed, Cancelled, All.
  - On phones the tab strip scrolls sideways.
- **Search and filters:**
  - search by order number (`#1003`), customer name or mobile;
  - filters for pickup or delivery and for paid or unpaid;
  - Clear filters.
- **Table:**
  - **Order:** number link, time ("Today, 10:42 am") and pickup or delivery;
  - **Customer:** name, mobile (tap to call), site, items and "N not available";
  - **Total:** amount with a Paid or Unpaid badge;
  - **Status and next step:** badge plus Start packing, Ready for pickup, Out for delivery or Mark completed. Cancel is never on a row.
  - The table fits from the 900 px desktop layout up; on phones each order is a card.
- **Pages, empty states and refresh:**
  - pages of 10, 25 or 50;
  - empty states: no orders yet, nothing in this step, nothing matches the filters;
  - refresh: every 30 s, only while the tab is visible and no sheet is open. A search or filter change starts a new count, so it never shows a false "new orders" toast.

## Order page (`/shops/{id}/orders/{orderId}`, a full page per D-051)
- **Header:** back to Orders, "Order #1027", the status badge, pickup or delivery and the time. The next step is the main button; **Cancel order** opens a sheet with the shop's ready messages or "Write my own", and the reason is required.
- **Items:**
  - product, brand, pack, shade, quantity × price and the amount;
  - lines that don't count are struck through;
  - status badges: Not available (with the message), Waiting for the customer, Replaced, Declined by the customer;
  - substitutes sit indented under the line they replace.
  - While the order is new or packing:
    - **Not available:** a sheet with the ready messages or "Write my own";
    - **Suggest substitute:** a sheet that searches the shop's available pack sizes, with quantity, an optional shade code and a message. The message isn't needed when the item already has one.
  - After completion the owner can **Record return** (quantity and reason).
- **Totals:** items, delivery (or "Free") and total.
- **Aside:**
  - **Customer:** name, mobile, "Orders in the app" or "Recorded by your shop", and the site;
  - **Pickup or delivery:** address, distance and an OpenStreetMap link;
  - **Payment:** Paid with the method and time, or **Record payment** (Cash, UPI or Bank transfer), owner only, once ready;
  - **Timeline** in plain words, newest first.
- Every action closes its sheet, shows a toast and refreshes only the data, with no page reload. Another shop's order or a bad id shows "not found".

## Components and helpers
- `Badge` tone `error`.
- `Button` size `compact` for actions in table rows.
- `Combobox`: the "create" option is now optional (`emptyLabel` when nothing matches).
- `SegmentedLinks` scrolls sideways when there are too many segments for the width.
- Radio ids use the option's position, because values may be free text.
- `showToast` / `ToastHost` for a page-level toast that survives the row leaving the list.
- `components/orders/` contains `StepButton`, `OrdersAutoRefresh` and `order-forms` (cancel, payment, not available, substitute, return).
- `lib/orders/labels.ts` holds words, colours, next steps, times and timeline sentences.
- `lib/api/orders.ts` is the API client.
- Server Actions are in `app/shops/[shopId]/orders/actions.ts`.

## Tests
- **Web:**
  - `lib/orders/labels.test.ts`: colours, next steps, IST "Today" and "Yesterday", timeline sentences;
  - `components/orders/orders-ui.test.tsx`: 30-second refresh and the new-order toast, red badge, Combobox without "create".
- **API:** `orders.e2e-spec.ts` adds the `ready` tab and count; the full suite passes (144).
- **Chrome** (ABC PAINTS, 1280, 960 and 518 px):
  - tabs and counts; search by number and by name;
  - a row step updates the row, counts and toast with no reload;
  - an order placed while the page was open showed "1 new order" with no reload;
  - Not available set the total to ₹0 with the message;
  - a substitute was found through search and shows as waiting;
  - cancel with a ready reason; payment by UPI with a toast; a return adjusted the total;
  - no horizontal scroll at any width; no console errors.

## Limits
- The 30-second check is a poll; instant push comes with the apps.
- The customer's answer to a substitute comes with the Customer App.
- Refunds for returns come with bills (Phase 3).
