# BIL-002: Bills in the Shop App

- **Feature ID:** BIL-002
- **Status:** Complete (local; Flutter tests). Not seen on a device.
- **Last updated:** 2026-11-22
- **Related modules:** Shop App (uses the BIL-001 API; no API change)
- **Decisions:** D-056 (permissions), D-062 (running bill)

## 1. Goal

The shop sees and settles each customer's running bill from the phone, the same way as on the web (BIL-001).

## 4. User flow

1. **Customer page › Bill** (owner, or anyone with payments or money figures): the balance with Owes you / You owe / Settled, **Record payment** or **Record refund** (payments permission only), "Billed by site" for painters, entries newest first (an order entry opens the order) and **Older entries**.
2. **Record payment** (bottom sheet): amount (starts at what is owed; more is refused in the sheet and by the API), Paid by, optional note. One request key per sheet, kept across retries. A toast says what was recorded and the bill updates in place (D-044).
3. **Side menu › Money › Bills**: "Customers owe you" and "You owe after returns", search, balance chips (All, Owes you, You owe, Settled), customers largest owed first, Load more. A customer opens their page.
4. **Order page**: Paid, **Part paid** ("₹X of ₹Y paid from the customer's bill") or Unpaid; Record payment asks for what is left.

Completing, paying or returning on an order refreshes the bill and the Bills list.

## 6a. Design (D-060)

| Our screen | Design screen | Status |
|---|---|---|
| Customer page › Bill | (none) | Follows the customer page sections; bottom sheet for the form (mobile pattern) |
| Bills | (none: Bills is a Phase 3 placeholder in the design) | Follows Customers: search, chips, cards, Load more; `AppStatTile` totals |
| Order page › Payment | Shop App › Order page | Adds Part paid (info tone, distinct from Paid and Unpaid) |

## 9. Security

The API checks membership and permissions on every call (BIL-001); the app only hides what a member can't use. Shared change: `newRequestId` moved to `flutter_shared` (used by Customer App checkout and the payment sheet).

## 10. Acceptance criteria

- [x] The customer page shows the bill, billed by site and entries.
- [x] A payment up to what is owed is recorded once; more is refused.
- [x] A refund is recorded when the shop owes.
- [x] Without payments or money figures: no bill and no Bills menu row; with money figures only: the bill without Record payment.
- [x] Bills lists balances with totals and a balance filter.
- [x] A part-paid order says so.

## 11. Test plan (run)

`test/bills_test.dart` (7 tests). Shop App, shared and Customer App suites, analyze and `pnpm ui:check`. Not run: on a device.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-22 | Implemented |
