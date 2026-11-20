# Feature: Cart (Customer App)

- **Feature ID:** CUS-004
- **Status:** Complete (local; API e2e, Flutter tests, add-to-cart path on a physical Android phone)
- **Last updated:** 2026-11-20
- **Related modules:** API `apps/api/src/shop-discovery/storefront.*` (`GET /v1/discover/shops/{shopId}/products/{productId}/shades`, `POST /v1/discover/shops/{shopId}/cart-check`); Customer App `lib/src/cart`, `lib/src/features/cart`, product page; `flutter_shared` `AppQuantityStepper`, `AppIconButton.count`
- **Decisions:** D-029 (unavailable packs cannot be added), D-059 (one cart at a time, asks before a new shop's cart; shade picked or typed; requests for unavailable items later; order of work cart → sites → checkout), CLAUDE.md §3 (a cart never mixes shops)

## 1. Goal

A painter or customer collects what they want from one shop: the size, the shade where needed and the quantity. They see the total before checkout. Checkout (pickup or delivery, placing the order) is CUS-006, after the painter's sites (CUS-005).

## 2. Behaviour

1. **Product page:** choose the size; products in shades show a required **Shade** row; then the quantity stepper and **Add to cart**.
   - An unavailable size shows **Not available** and cannot be added (D-029).
   - Adding the same size and shade again adds to its quantity, up to 999. A cart holds at most 50 lines, the same as an order.
   - After adding, a toast shows "Added to cart." with View cart.
2. **Shade picker** (bottom sheet): search by code or name.
   - The list shows the shop's favourite shades first (marked "Shop's pick"), then the brand's shade card, then the shop's own codes, each with its swatch.
   - Under it: "Not listed? Type the shade code": the code is required and saved in upper case; the name is optional.
   - A note says colours on screens are only a guide.
3. **Another shop:** adding from a different shop asks "Start a new cart?". **Keep my cart** changes nothing; **Start new cart** replaces the old shop's items. A cart never mixes shops.
4. **Cart** (the cart icon with the item count, on Home and the product page):
   - lines with product, brand and size, shade (swatch and code), line total and each price, a quantity stepper and remove;
   - **Add more from <shop>**;
   - Subtotal (n items), with a note that pickup or delivery and the delivery charge are chosen at checkout, and that payment is to the shop at pickup or delivery (D-053).
   - Opening the cart checks today's prices and availability with the shop. Changed prices are updated and reported. Lines that are not available now, or no longer sold, are marked and left out of the subtotal. If the check fails, the cart stays and offers Try again.
   - Empty cart: "Your cart is empty" with Browse products.
5. Sign-out empties the cart on the phone.

## 3. Rules and privacy

- The cart lives on the phone (secure storage), not on the server. Nothing about it is visible to the shop until an order is placed.
- Prices in the cart are only a preview; the server prices every line again when the order is placed (ORD-001 `OrderPlacementService`).
- The shade list and the cart check are read-only and only answer for Live shops and visible products. They never return MRP. A pack from another shop is left out of that shop's check.

## 4. Not included

- Checkout, placing the order, My Orders (CUS-006); painter's sites (CUS-005).
- Requests for unavailable items (D-029; later, once notifications are decided, question 53).
- Painter-only prices (none exist yet; D-036).

## 5. Verification (2026-11-20)

| Check | Result |
|---|---|
| API e2e `cart-support.e2e-spec.ts` (6): favourites first, then card and own shades; inactive and other brands' shades left out; search; none for products without shades; today's price and availability; archived and unknown packs left out; another shop's packs left out; empty and oversized checks refused | Passed |
| Flutter customer_app (33, 9 new: add with quantity and badge, shade required and picked, typed shade, unavailable size, another shop asks, cart quantity, remove and subtotal, price and availability check, failed check, sign-out empties), flutter_shared (96, new stepper and badge tests), shop_app (183) | Passed |
| Physical phone (local stack) | Searched Demo Weathercoat Exterior at ABC PAINTS. Opened the shade picker (the brand's shade card with swatches) and chose DM-005 Backwater Blue. Set quantity 2 and Add to cart: "Added to cart." and the badge showed 2. The cart showed the shade swatch, ₹900 (₹450 each) and Subtotal (2 items). The toast followed into the cart, so the cart now closes it on opening (tests only) |
