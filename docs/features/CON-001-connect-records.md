# CON-001: Connecting a shop's records to the app

- **Feature ID:** CON-001
- **Status:** Complete on the server, shop web and Customer App (local; API e2e, web and Flutter tests). Not seen in a browser or on a device. The Shop App's approve screen is CON-002.
- **Last updated:** 2026-11-22
- **Related modules:** API, shop admin web, Customer App
- **Decisions:** D-054 (shop records private until connected), D-055, D-062 (running bill), D-063 (how connecting works)

## 1. Goal

Someone the shop recorded by mobile before they used the app sees those orders and that bill in their app, once they ask and the shop agrees.

## 4. User flow

1. **Customer App › a shop's page:** "Ordered here before the app?" → **Ask to connect my records**. Then "Request sent", "Records connected", or "Not connected" (can ask again). The app never says whether the shop has a record.
2. **Shop web › Customers:** **Connection requests** (only when there are any; customers permission): name, mobile, when asked, "already orders in the app" when it will merge. **Connect** or **Decline**, each with a confirmation that says what happens.
3. After Connect: the record's orders and bill show in the person's My Orders and Bills.

## 5. Business rules (D-063)

- The person asks; their verified mobile from sign-in stands for the OTP of D-054. No SMS is sent.
- The shop sees a request only on its own unmerged record of the same mobile; requests from other mobiles never show.
- **No app record at the shop:** the record is linked to the account.
- **The person already orders there in the app:** in one transaction, the record's orders, bill entries and the shop's sites move to the app record; the bill is settled again (oldest orders first). Amounts never change: the append-only trigger allows only the record an entry belongs to to change, and only inside the merge (`paintshop.bill_merge`). The old record is kept as merged (`merged_into_id`), hidden everywhere, never deleted, and frees the mobile for new records.
- The shop's recorded sites stay the shop's (not the painter's own sites).
- Decline keeps everything private; the person may ask again. One open request per person and shop.
- Audit: `shop_customer.connect_requested`, `.connected` (with counts moved), `.connect_declined`.

## 6a. Design (D-060)

| Our screen | Design screen | Status |
|---|---|---|
| Shop page › connect card | Customer App › Shop page | Added below Address as an `AppSection`; the design has no such card |
| Customers › Connection requests | (none) | Card above the customers table; confirmations for both answers |

## 7. API contract

- `GET /v1/me/shops/{shopId}/connect` → `{status: NONE|PENDING|APPROVED|DECLINED, requestedAt}`; `POST` asks (repeating is fine).
- `GET /v1/shops/{shopId}/connect-requests` → `{items[{id, requestedAt, customer {id, name, phone, kind}, mergesIntoAppRecord}]}`.
- `POST …/connect-requests/{id}/approve` → `{customerId, merged}`; `POST …/{id}/decline` → 204. Errors: `connect_request_not_found`.

## 8. Data model

Migration `20261122125858_con_001_connect_records`: `customer_connect_requests` (one PENDING per shop and person, RLS); `shop_customers.merged_into_id`, `merged_at` (CHECK, FK to the same shop); the recorded-mobile unique index skips merged records; the bill-entry trigger's merge exception.

## 10. Acceptance criteria

- [x] A person asks; the shop sees it only on its matching record.
- [x] Approving links the record, or merges it into the app record with every amount kept.
- [x] The merged record no longer shows; entries still can't change outside a merge.
- [x] Another shop sees nothing and can't answer; decline keeps records private; asking again works.

## 11. Test plan (run)

API: `connect.e2e-spec.ts` (3 tests). Customer App: `shops_test.dart` connect test. Web: lint, typecheck, unit tests. Not run: browser and device (the machine was low on memory).

## 12. Not included

- CON-002: the requests in the Shop App.
- A notification to the shop when someone asks (push is postponed).

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-22 | Implemented |
