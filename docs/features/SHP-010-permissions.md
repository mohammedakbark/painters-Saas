# SHP-010: Shop permissions

Status: **Complete (local; API unit and e2e, web and Shop App tests)**. First of the Shop App redesign features the product owner asked for on 2026-11-15 (SHP-010 to SHP-014). Decision D-056, ADR 0010.

## Goal
Each feature is shown and allowed only for people who have its permission, so that employees (a later feature) see only what the owner gives them. Today the owner has every permission, so owners see no change.

## Permissions

| Key | Lets the person |
|---|---|
| `orders.handle` | See orders, move steps, not available, substitute, cancel |
| `orders.payments` | Record payments and returns |
| `orders.record` | Record phone and counter orders |
| `customers.manage` | See, add and edit the shop's customers and sites |
| `catalogue.view` | See products, prices, shades and categories |
| `catalogue.manage` | Change products, prices, availability, shades and categories |
| `shop.profile` | Edit the profile, photo and map location; submit for review |
| `shop.settings` | Delivery settings and order messages |
| `reports.view` | Money figures: today's sales and unpaid totals |
| `staff.manage` | Add employees and set their permissions (later) |

Shared reads: reading one order needs any order permission; the pack list (`catalogue/product-rows`) also opens with `orders.handle` or `orders.record`; Shop settings (read) also with `orders.handle` or `orders.record`; finding, reading and adding a customer also with `orders.record`.

## API
- `shop-access/shop-permissions.ts`: the list, `permissionsFor(role)` (MASTER → all), `ShopPermissionsResolver`, `requireShopPermission`, `requireAnyShopPermission`. `shop-roles.ts` is removed.
- `ShopAccessGuard` adds `permissions` to `ShopContext`.
- `GET /v1/shops/:shopId` and `POST /v1/shops` return `permissions`.
- `GET /orders/summary`: `unpaid.totalPaise` and `today.salesPaise` are null without `reports.view`.
- Every service check now names a permission (orders, customers, catalogue reads and writes, profile, photo, review, settings).

## Web
- `lib/api/shops.ts`: `permissions` and `can(shop, key)`. Catalogue, shades and categories edit with `catalogue.manage`; payments with `orders.payments`; profile and review with `shop.profile`; settings with `shop.settings`.
- The Overview hides "Today's sales" and the unpaid amount when the API leaves them out.

## Shop App
- `shops/shop_permissions.dart` (`ShopPermission`), `MyShop.permissions` and `can()`. A missing list means no permissions.
- Home: Orders and the order figures need `orders.handle`, Products needs `catalogue.view`, "Today's sales" and the unpaid amount only when sent.
- New order button needs `orders.record`; product changes `catalogue.manage`; payments and returns `orders.payments`; profile location `shop.profile`.

## Tests
- API unit `shop-permissions.spec.ts`; guard spec updated.
- API e2e `permissions.e2e-spec.ts` (16): each protected job refused without its permission with nothing changed, and allowed with only that permission; any order permission reads an order; the reads order work needs; money hidden without `reports.view`; tenant isolation unchanged. A test resolver (`test/support/fake-shop-permissions.ts`) stands in for employees. Full e2e suite 169.
- Web 248 tests. Shop App 131 (permission tests in `test/permissions_test.dart`; staff fixtures now carry limited permissions).

## Limits
- No employee accounts yet; nobody but the owner can sign in to a shop.
- The redesigned navigation (tabs, drawer) is SHP-011.
