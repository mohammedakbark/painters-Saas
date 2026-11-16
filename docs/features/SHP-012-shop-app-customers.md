# SHP-012: Customers tab in the Shop App

Status: **Complete (local; tests, Android emulator 2026-11-16)**; see `docs/PROJECT_STATE.md` §6. Third of the Shop App redesign features (owner, 2026-11-15).

## Goal

Bring the web Customers area (ORD-004) to the Shop App in mobile form: the shop's own customers and painters' sites, on the same API. No API or database change.

## Rules (unchanged, ORD-004)

- Customers the shop records are private to the shop (D-054); the person isn't told.
- Painter or Customer (D-055). Sites only for painters the shop recorded; painters who use the app keep their own sites.
- The mobile of a customer who uses the app comes from their account and can't be changed.
- The API checks every call: `customers.manage` for the tab, the page, edits and sites; `orders.handle` for the latest orders; `orders.record` for New order.

## Customers tab

- Fourth tab (Home, Orders, Products, **Customers**), shown only with `customers.manage` (D-056).
- Search by name or mobile (on search, like Orders), chips **All**, **Painters**, **Customers**.
- Cards: name, Painter or Customer badge (different colours), mobile, "Uses the app" or "Recorded by you", orders and the last order date, sites for painters the shop recorded.
- Pages of 25 with **Load more**; loading, empty ("No customers yet"), no match ("Show all customers") and error with **Try again**.
- **Add customer** at the bottom opens a bottom sheet (name, mobile, type). A mobile already in the shop's customers shows the API's message on the field. After saving, the customer's page opens with "Customer added".

## Customer page

- Opens above the tabs with a back arrow; a link without `customers.manage` shows "You don't have access to this".
- Name, badge, "Uses the app" or "Recorded by your shop", **Call** (the phone's dialler).
- **Edit** (top bar): name, type and, for shop records, the mobile. Saving only sends what changed.
- **Latest orders** (with `orders.handle`): the newest 5, each opening the order.
- **New order** at the bottom (Live shop, `orders.record`): opens New order with this customer already chosen (`/orders/new?customerId=`).
- An unknown customer, or one of another shop, shows "Customer not found".

## Sites (painters the shop recorded)

- Each site: name, owner, address, and "Map pin set on the web" when the web set a pin.
- **Add site** / **Edit** sheet: name, owner (optional), address or place. The API's limits are checked first; `site_name_taken`, `site_limit` and `sites_for_painters_only` are shown in the API's words.
- **Archive** asks first; **Archived sites (n)** lists them with **Restore**. Each site's button shows its own busy state.
- The app doesn't set map pins: staff are usually at the shop, so their location would pin the wrong place. Editing a site keeps a pin set on the web (the app never sends `pin`).
- Painters who use the app: "This painter uses the app and keeps their own sites there." Customers have no Sites section.

## Code

- `customers/customer_models.dart`: `CustomerListItem`, `CustomerListPage`, full `CustomerSite` (owner, pin, archived), `CustomerDetail.archivedSites` and `orderCount`.
- `customers/shop_customers_repository.dart`: `list`, `update`, `createSite`, `updateSite`; `CustomerListFilter`, `SiteFields`.
- `customers/customer_providers.dart`: `customerListProvider` (load more), `customerProvider`, `customerOrdersProvider`.
- `orders/shop_orders_repository.dart`: `latestForCustomer` (`customerId` filter of the orders API).
- `features/customers/`: `customer_list_screen.dart`, `customer_screen.dart`, `customer_sheets.dart` (`CustomerForm`, also used by New order, and `SiteForm`), `customer_labels.dart`.
- `features/shell/shop_shell.dart`: `ShopTab.customers`; `routing/router.dart`: the customers branch and `:customerId`.
- New order: optional `customerId`; the no-sites message now points to Customers.

## Tests

- `test/customers_test.dart` (17): list, filter, search, load more, empty, retry, add (duplicate mobile), customer page, call, latest orders, New order with the customer chosen, no New order or orders without permission, edit, app customer's mobile locked, no sites for customers, not found, add site (checks and duplicate name), edit keeps the pin, archive with confirmation and restore, refused restore.
- `test/permissions_test.dart`: Customers tab only with `customers.manage`; a customer link without it shows the no-access screen.
- The full Shop App suite passes (149).

## Limits

- Map pins for sites stay on the web.
- Customers are not deleted (as on the web).
- Connecting a shop record to the person's app account comes with the Customer App.
