# BIL-001: Running bill and payments

- **Feature ID:** BIL-001
- **Status:** Complete on the server and shop web (local; API e2e, web unit tests, build). Not seen in a browser.
- **Last updated:** 2026-11-22
- **Related modules:** API, shop admin web (Shop App in BIL-002, Customer App in BIL-003)
- **Decisions:** D-008, D-009 (shop-wise bills), D-047 (returns), D-053 (payment methods), D-056 (permissions), D-062 (running bill)

## 1. Goal

Each shop keeps one running bill with each customer: what they owe after completed orders, payments and returns, as auditable entries rather than a number someone types.

## 4. User flow (shop web)

1. **Bills** (sidebar, Daily work): "Customers owe you" and "You owe after returns", then a table of customers with a bill, largest owed first. Filters in the URL: search, type, balance (Owes you, You owe, Settled). Server-side pagination.
2. **Customer page › Bill**: the balance with its state, **Record payment** (or **Record refund** when the shop owes), "Billed by site" for painters, and every entry newest first (Order, Return, Payment, Refund) with Newer / Older pages.
3. **Record payment** (side sheet): amount (starts at what is owed), Paid by (cash, UPI, bank transfer), optional note. More than owed is refused next to the amount.
4. **Order page**: Paid, **Part paid** ("₹X of ₹Y paid from the customer's bill") or Unpaid; the timeline says when the bill paid it.

## 5. Business rules (D-062)

- **Charge:** an order goes on the bill once, at its total, when it is completed, or earlier when it is paid on the order ("Mark paid", allowed from Ready). A ready order can only be completed, so charging it at payment is safe.
- **Adjustment:** a return after completion lowers the bill by the returned amount.
- **Payment:** any amount from ₹1 up to what is owed; no advances. Payments pay the oldest charged orders first: an order is Paid when covered, Part paid in between. "Mark paid" on an order pays what is left on that order.
- **Shop owes:** a return on a paid order can leave the shop owing. That money pays the customer's next orders automatically, or the shop records a **refund** (at most what it owes).
- **Balance** = sum of entries (positive: the customer owes; negative: the shop owes). Never stored.
- A painter's bill shows what each site was billed (order totals by site name); payments go against the one balance.
- Shop-recorded orders handed over at once are charged, and paid on the spot when a payment method is given.
- **Back-fill:** orders completed or paid before BIL-001 were charged at their current total, and paid orders got a payment of that total (earlier returns were settled outside the app).
- An order paid from money the shop already held takes the method of the customer's latest payment (every paid order names a method).
- No GST invoices, numbering or credit notes yet (question 35).

## 6a. Design (D-060)

| Our screen | Design screen | Status |
|---|---|---|
| Bills | (none: "Bills & credit" is a Phase 3 placeholder) | Follows Shop Admin › Customers: stat tiles, filter bar, `DataTable`, pagination |
| Customer page › Bill | (none) | Follows the customer page cards; record forms are side sheets (D-051) |
| Order page › Payment | Shop Admin › Order page | Adds the Part paid badge (warning tone, distinct from Paid and Unpaid) |

## 7. API contract

- `GET /v1/shops/{shopId}/bills?q&kind&status=owing|shop_owes|settled&page&pageSize` → `{items[{customer, balancePaise, lastEntryAt}], totals {owingPaise, shopOwesPaise}, total, page, pageSize}`.
- `GET /v1/shops/{shopId}/customers/{customerId}/bill?page` → `{customerId, balancePaise, sites[{label, billedPaise, orderCount}], entries {items[{id, kind, amountPaise, createdAt, order, method, note}], page, hasMore}}` (20 per page).
- `POST …/bill/payments` and `…/bill/refunds` `{amountPaise, method, note?, clientRequestId}` → the bill. Errors: `bill_nothing_owed`, `payment_exceeds_balance`, `refund_exceeds_owed`, `request_id_reused`.
- Order detail `payment.paidPaise` (new).
- Reading needs `orders.payments` or `reports.view`; recording needs `orders.payments`.

## 8. Data model

Migration `20261122063212_bil_001_running_bill`: table `bill_entries` (kind CHARGE / ADJUSTMENT / PAYMENT / REFUND, signed amount, order, method, note ≤ 300, request id unique per shop, created by); a CHECK on each kind's shape; one CHARGE per order; append-only trigger; RLS on. `orders.paid_paise` (≥ 0) and `orders.charged_at`. Back-fill as above.

## 9. Security

Every query is keyed by the shop from `ShopContext`; another shop's customer is 404 (e2e). Each change locks the customer's bill row, then the order, in one transaction, so concurrent payments and order steps can't double count. A repeated request id records once (e2e with two at the same time). Audit: `bill.payment_recorded`, `bill.refund_recorded` (amount and method, never the note); order payments keep `order.payment_recorded` with the amount.

## 10. Acceptance criteria

- [x] Completing an order puts it on the bill; ready orders are not on it.
- [x] A payment of any amount up to what is owed pays the oldest orders first; more is refused.
- [x] Paying on the order charges it once, before or after completion.
- [x] A return after payment is owed back: refunded (capped) or used by the next orders.
- [x] Shop-recorded handed-over and paid orders go on the bill; painters see billed by site.
- [x] A repeated request records one payment; entries can't be changed or deleted.
- [x] One shop can't read or change another shop's bills.

## 11. Test plan (run)

API: `bills.e2e-spec.ts` (8 tests); the ORD-003 overview test now expects unpaid to be what is left to pay. All 230 e2e and 122 unit pass; lint, typecheck, drift check, OpenAPI exported. Web: `labels.test.ts`; all 255 web tests, lint, typecheck, `next build`; `pnpm ui:check`. Not run: a browser check of the new pages.

## 12. Not included

- Bills in the Shop App (BIL-002) and "what I owe" in the Customer App (BIL-003).
- Credit (limits, approval, ID documents: question 57), GST invoices (question 35), online payments (D-018), final bills.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-22 | Implemented (server and shop web) |
