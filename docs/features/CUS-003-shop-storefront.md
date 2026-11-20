# Feature: Shop storefront (Customer App)

- **Feature ID:** CUS-003
- **Status:** Complete (local; API e2e, Flutter tests, Home storefront on a physical Android phone)
- **Last updated:** 2026-11-20
- **Related modules:** API `apps/api/src/shop-discovery/storefront.*` (`GET /v1/discover/shops/{shopId}/categories`, `/products`, `/products/{productId}`), reusing `shop-catalogue-mapping.ts`; Customer App `lib/src/storefront`, `lib/src/features/storefront`, Home and shop page
- **Decisions:** D-029 (availability), D-036 (no painter-only data), D-037 (browse any Live shop), D-058, question 59 (no MRP strike, offers or ratings); owner 2026-11-20: browse only, no Add button until the cart feature

## 1. Goal

A painter or customer sees what the shop sells and at what price: its categories, products, pack sizes, prices and availability. Ordering comes with the cart and checkout.

## 2. Behaviour

1. **Home** with an active shop shows "Shopping from" (the shop card and Change shop), then the shop's storefront:
   - search by product or brand name;
   - category chips (All plus the categories that have products; hidden when there is only one);
   - a two-column grid of product cards (picture, name, brand, "₹500" or "From ₹500", and **Not available** when no pack can be bought);
   - Load more, 20 at a time; pull to refresh.
2. **Shop page** (CUS-002) has **See products**, which opens the same storefront for any Live shop without adding it or shopping there (D-037).
3. **Product page:** picture, brand, name, category and pack-size chips.
   - The chosen size shows the shop's price and **Available** or **Not available** (D-029). The first available size is chosen first.
   - Products that come in shades show "Available in shades. You choose the shade when you order."
   - Then the description, and every size with its price.
4. Empty shop: "No products yet". No match: "No products found". A removed product: "This product is not available".

## 3. Rules

- Only Live shops have a storefront; other shops answer 404.
- A product is shown when it is not archived and has at least one pack. Its catalogue product, brand and category must be active; for an own product, its category must be active.
- Unavailable packs are shown and marked; they cannot be bought (D-029).
- The response is an allow-list (`StorefrontProductSchema`): the shop's selling price only, never MRP (question 59), the product status, internal catalogue ids or catalogue sizes the shop does not sell. There are no painter-only prices in the data yet. When they come, they need the shop's painter confirmation (D-036).
- Each shop's storefront shows only its own products and prices. A product id from another shop answers 404. Cross-shop product search is a later feature.

## 4. Not included

- Add to cart, quantity, cart and checkout (next feature); choosing a shade.
- Requesting an unavailable item (D-029, with the cart).
- Cross-shop product search, offers, ratings, MRP.

## 5. Verification (2026-11-20)

| Check | Result |
|---|---|
| API e2e `storefront.e2e-spec.ts` (7): sign-in required, visible products by name with own prices, unavailable packs marked, no MRP or internal fields, category filter, search by brand, pages, categories with counts, archived, hidden and other shops' products 404, separate prices per shop, draft shops 404 | Passed |
| Flutter customer_app (24, 6 new: Home storefront with prices and Not available and no Add, category chips and search, product page sizes and availability, another shop's products from its page, empty shop, removed product), flutter_shared (92), shop_app (183) | Passed |
| Physical phone (local stack) | First the dev API had stopped (a parallel check run cleared its build folder), and the app showed its "couldn't load your profile" error view with Try again. After a restart, Home showed ABC PAINTS' storefront: categories as chips, the two-column grid, "From ₹450" and "Not available". The product page was not opened on the phone (battery 4%) |
