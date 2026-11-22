# BIL-003: My bills in the Customer App

- **Feature ID:** BIL-003
- **Status:** Complete (local; API e2e, Flutter tests). Not seen on a device.
- **Last updated:** 2026-11-22
- **Related modules:** API, Customer App
- **Decisions:** D-008, D-009 (shop-wise bills), D-054 (shop records stay private until connected), D-062 (running bill)

## 1. Goal

A painter or customer sees what they owe each shop they buy from, with each shop's bill kept separate.

## 4. User flow

1. **More › Bills**: each shop with a bill: the amount and You owe / Shop owes you / Settled, most owed first. "Pay the shop in cash, by UPI or bank transfer. The shop records it here." Empty state before the first completed order.
2. **A shop's bill**: total banner (`AppTotalBanner`), "Billed by site" for painters (payments go against the one bill), entries newest first (Order #…, Return, Payment · UPI, Refund from the shop); an order entry opens the order; Older entries.
3. **Site page** (CUS-007): under each shop, "Your bill with this shop: you owe ₹… for all sites" (or what the shop owes), and "Your bills with these shops" opens My bills. This replaces the "billing later" note.
4. **Order page**: "Part paid · ₹X of ₹Y" when the bill paid part of it.

People can't pay in the app (no online payments, D-018); the shop records payments (BIL-001, BIL-002).

## 5. Business rules

- Only the caller's own records: `shop_customers.user_id` = the signed-in person. A shop's record of the same mobile that is not connected to the account is not shown (D-054).
- The shop's notes on payments and refunds are not shown to the customer.
- At most 100 shops are listed (a bound, not a business rule).

## 6a. Design (D-060)

| Our screen | Design screen | Status |
|---|---|---|
| My bills, a shop's bill | (none; the design lists Bills with credit as later) | Follows the Customer App site spend and My Orders patterns |
| Site page | Customer App › Site spend | The design's billing note is replaced by each shop's bill and a link to My bills |

## 7. API contract

- `GET /v1/me/bills` → `{items[{shop {id, name}, balancePaise, lastEntryAt}]}`.
- `GET /v1/me/bills/{shopId}?page` → `{shop, balancePaise, sites[…], entries {items[{id, kind, amountPaise, createdAt, order, method}], page, hasMore}}`; 404 `bill_not_found`.
- `GET /v1/me/orders/{id}`: `payment.paidPaise` (new).

## 10. Acceptance criteria

- [x] A person sees their bill with each shop and each shop's entries.
- [x] The shop's notes are not shown; another person's bills and the shop's unconnected record of their mobile are not shown.
- [x] The site page shows what the painter owes each shop.
- [x] A part-paid order says so.

## 11. Test plan (run)

API: 2 new e2e in `bills.e2e-spec.ts` (232 e2e, 122 unit pass; lint, OpenAPI). Flutter: `my_bills_test.dart` (4); Customer App 57; analyze; `pnpm ui:check`. Not run: on a device.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-22 | Implemented |
