# CRD-001: Shop credit

- **Feature ID:** CRD-001
- **Status:** Complete on the server and shop web (local; API e2e and unit tests, web unit tests, build). Not seen in a browser yet.
- **Last updated:** 2026-11-27
- **Related modules:** API, shop admin web (Shop App in CRD-002, Customer App in CRD-003)
- **Decisions:** D-010, D-011, D-050, D-056 (permissions), D-062 (running bill), D-063 (connected records), D-064 (credit rules)

## 1. Problem and goal

The running bill (D-062) already lets every customer owe money, with no approval and no limit. CRD-001 lets each shop decide who may buy on credit, up to what amount, after checking their ID in person, and warns the shop when an order goes past that.

## 2. User roles and permissions

- New permission **`credit.manage`** (tick box, SHP-010): check an ID, give credit, change a limit, stop credit, see credit figures. The owner (MASTER) has it.
- Members with `orders.handle` or `orders.record` see the warning on an order ("Over credit limit" / "No credit, owes ₹X"); the limit and amounts need `credit.manage` or `reports.view`.

## 3. Preconditions

- The customer has a Customer App account (OTP-verified mobile) and is connected to this shop: `shop_customers.user_id` is set (CON-001). Shop-recorded customers without an app account show "Needs the app to get credit".

## 4. User flow (shop web)

1. **Customer page › Credit** card (beside Bill): state (No credit / Credit ₹limit, ₹X left / Stopped), ID check line ("Aadhaar ···1234, checked by Ravi on 27 Nov"), history.
2. **Check ID** (side sheet, D-051): document type (Aadhaar, PAN, Voter ID, Driving licence, Passport), last 4 characters, a tick "I saw the original document". Saving records who and when.
3. **Give credit** (side sheet, needs the ID check): limit in ₹, reason. **Change limit** and **Stop credit** the same way (reason required).
4. **Bills** list: a Credit column (limit, or "—") and a filter "Over limit".
5. **Accepting an order** (New → Packing): the order page shows the warning; over the limit, "Start packing" opens a confirm dialog with "Accept anyway". A list-row step over the limit is refused with "Open the order to accept it anyway". **Saving a phone/counter order** over the limit shows the warning with an "Accept anyway" tick; saving again with it ticked goes through. An order accepted over the limit when saved is not asked again when it is accepted.

## 5. Business rules (D-064)

- **Owed** = the customer's bill balance (sum of bill entries, D-062), never stored. **Left** = limit − owed (can be negative).
- **Over-limit warning** (customer has credit): owed + the order's total > limit. **No-credit warning** (no credit or stopped): owed > 0. Warnings never block.
- Accepting despite the over-limit warning needs `acceptOverLimit: true` from the client and writes a credit event `OVERRIDE` (order, owed, limit, member). The no-credit warning is shown only and records nothing (rule 7: as today).
- Credit can be given only after an ID check at this shop and only to a connected app customer. Limit ₹1 – ₹10,00,000 (whole rupees, stored in paise).
- Each shop's ID check, approval and limit are private to it (D-010); other shops never see them.
- ID check stores type and last 4 characters only. No image, no full number.
- A merged shop record (CON-001) brings no credit: credit is given on the connected record.

## 6. UI requirements

States for each section: loading, empty ("No credit"), error, success toast. Status colours from tokens: Credit (ok), Over limit (error), Stopped (muted), No credit (neutral), distinct from each other. Warnings use the warning tone.

## 6a. Design (D-060)

| Our screen | Design screen | Status |
|---|---|---|
| Customer page › Credit | (none: "Bills & credit" is a Phase 3 placeholder) | Follows the customer page Bill card; forms are side sheets |
| Bills list Credit column | (none) | Follows the Bills `DataTable` |
| Order accept / record confirm | Shop Admin › Order page | Adds a warning panel to the existing confirm |

The sidebar "Bills & credit" item stops being greyed out (it already links to Bills).

## 7. API contract

- `GET /v1/shops/{shopId}/customers/{customerId}/credit` → `{status: none|active|stopped, limitPaise, owedPaise, leftPaise, idCheck {type, last4, checkedBy, checkedAt} | null, eligible: boolean, ineligibleReason?: no_app_account, events {items[{kind, limitPaise, reason, by, at, order?}], page, hasMore}}`. Needs `credit.manage` or `reports.view`.
- `POST …/credit/id-check` `{type, last4, sawOriginal: true, clientRequestId}`.
- `PUT …/credit` `{action: give|change|stop, limitPaise?, reason, clientRequestId}`. Errors: `credit_needs_app_account`, `credit_needs_id_check`, `credit_limit_invalid`, `credit_not_active`, `request_id_reused`. Needs `credit.manage`.
- Order accept and record: response `creditWarning {kind: over_limit|no_credit, owedPaise?, limitPaise?}`; request field `acceptOverLimit`. Without it, an over-limit accept returns `409 credit_over_limit` with the figures.
- `GET /v1/shops/{shopId}/bills`: `credit {limitPaise, status}` per row; filter `status=over_limit`.

## 8. Data model and migrations

Migration `crd_001_shop_credit`: one table `credit_events` (append-only trigger, RLS on): kind ID_CHECKED / GIVEN / LIMIT_CHANGED / STOPPED / OVERRIDE, limit, previous limit, owed (override), ID type and last 4, reason (2–300), order, created by, request id unique per shop. A CHECK fixes each kind's shape (last 4 must be 4 letters or digits); one OVERRIDE per order. The current status, limit and ID check are read from the latest events, never stored. Every change runs in one transaction after locking the customer's bill row (`lockBill`), so an accept, a payment and a limit change run one after the other.

**Owed** for credit is the bill balance plus the customer's accepted orders (packing, ready, out for delivery) that are not on the bill yet.

## 9. Security and privacy

- Shop from `ShopContext`; another shop's customer is 404 (e2e).
- `credit.manage` checked in the service; members without it get 403 (e2e).
- No ID image or full number is accepted: the schema rejects more than 4 characters.
- Audit: `credit.id_checked`, `credit.given`, `credit.limit_changed`, `credit.stopped`, `credit.override` (limits and amounts, never the reason text). Logs never contain the ID digits.

## 10. Acceptance criteria

- [x] A shop with `credit.manage` can record an ID check (type + last 4 only) for a connected app customer.
- [x] Credit can't be given without an app account or without an ID check here.
- [x] Give, change and stop each record who, when, old and new limit and a reason; events can't be changed or deleted.
- [x] Owed and left come from the bill entries (plus accepted orders not on the bill yet).
- [x] Accepting an order over the limit returns the warning; going on needs `acceptOverLimit` and records an override.
- [x] A no-credit customer who owes gets a warning only; the order still goes through.
- [x] Shop-recorded orders are checked when saved, unless paid on the spot.
- [x] Bills list shows credit and filters Over limit.
- [x] One shop can't read or change another shop's credit; a member without `credit.manage` can't change credit, and members without credit or money permission see warnings without figures.
- [x] A repeated request id records once, also when sent twice at once.

## 11. Test plan (run)

API: `credit.e2e-spec.ts` (9 tests: ID check and give, no app account, change and stop with append-only, over-limit accept with override and the Bills filter, no-credit warning, recorded orders, permissions and hidden figures, cross-tenant, repeated request at once); `credit-rules.spec.ts` (7). Full API suite 244 e2e and 129 unit pass; lint, typecheck, `db:check-drift`, OpenAPI exported. Web: `lib/credit/labels.test.ts`; all 258 web tests, lint, typecheck, `next build`, `pnpm ui:check`, repo `format:check`.

**Not run:** a browser check of the Credit card, its sheets, the order-page warning and the New order warning (the machine had too little memory for Supabase, the API, the web and Chrome together).

## 12. Dependencies and open questions

- Customer App display of limit and what is left: CRD-003 (owner, 2026-11-27). No request button.
- Shop App: CRD-002.
- Have someone qualified confirm that storing the type and last 4 digits is fine (D-064).

## 13. Implementation notes

New module `apps/api/src/credit` next to `bills`, reusing `bill-ledger.ts` (`lockBill`, `billBalance`) and `requireShopPermission`. Web: `apps/admin_web/src/app/shops/[shopId]/customers/…` Credit card and sheets with the existing `SideSheet`, `Toast`, `DataTable`.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-27 | Spec written from D-064 and the owner's answers (warn on accept, customer sees limit and what's left, server and shop web first) |
| 2026-11-27 | Implemented (server and shop web). One append-only `credit_events` table instead of a state row plus history; accepting over the limit on the order page is a confirm dialog |
