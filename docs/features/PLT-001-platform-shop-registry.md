# Feature: Platform shop registry (read-only)

- **Feature ID:** PLT-001
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-03
- **Related modules:** API (`platform-shops`), Admin Web (`/platform/shops`)
- **Decisions:** D-024 (shops self-register), D-025 (platform approval after the onboarding checklist), ADR 0006 (cursor pagination)

## 1. Problem and goal

Shops now register themselves (SHP-001). The platform team needs to see which shops have registered, when they did, and who owns them, so they can support the owners and later review and approve the shops (PLT-002). This feature gives platform admins a **read-only** registry: a paginated list and a detail page for each shop.

## 2. User roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Platform Super Admin | List all registered shops (newest first); open any shop's registry detail | Change anything (no approve, edit or suspend in this feature) |
| Shop users and every other account | Nothing here (403 from the API) | See the registry or another shop's owner contact |

## 3. Preconditions

A platform admin exists (AUTH-001). Shops exist from self-registration (SHP-001).

## 4. User flow

1. The platform admin signs in and opens **Shops** in the console navigation.
2. `/platform/shops` lists shops, newest first, 20 per page:
   - Each row shows the name, status, owner name, owner mobile and registration date.
   - **Next page** loads the following 20; **First page** returns to the start.
3. Selecting a shop opens `/platform/shops/{id}` with the same facts and the last-updated time.

Alternate and failure paths:
- **No shops yet:** an empty state, "No shops have registered yet."
- **Unknown or malformed shop id:** a "Shop not found" view with a link back to the list.
- **API unavailable:** the platform error view with a retry button.
- **Non-admin:** the console sends them to `/platform/no-access`, and the API answers 403.

## 5. Business rules

1. Only platform admins can read the registry (`PlatformAdminOnly`).
2. The registry shows registration facts only: shop name, status, created and updated times, and the master account's name and mobile number. It shows **no** private shop business data (products, customers, orders, credit, bills). None exist yet, and later features must keep them out of this view.
3. Reading the registry is not audited. It is platform onboarding data the platform needs for support and review, not private tenant business data. Platform access to private tenant data (`DATA_AND_SECURITY.md` §9) will be audited when such access exists.
4. Ordering is newest first, with cursor pagination (`limit` 1–50, default 20).

## 6. UI requirements

- A **Shops** navigation item in the platform console.
- The list is a table at `medium` and wider, and cards on compact screens:
  - Status is a text badge.
  - Each shop name links to its detail page.
  - Pagination links appear only when there is a next page, or when not on the first page.
- The detail page shows a header with the shop name and status, a description list of the facts, and a link back to the list.
- Loading comes from the console Suspense fallback. Empty, not-found and error states are covered.

## 7. API contract

- **`GET /v1/platform/shops?limit=20&cursor=<shopId>`**
  - `200`: `{ "items": [ShopRegistryEntry], "nextCursor": "uuid" | null }`
  - `400 validation_failed`: bad `limit` or `cursor`.
  - `401` / `403 platform_admin_required`.
  - `ShopRegistryEntry`: `{ id, name, status, createdAt, updatedAt, master: { name, phone } | null }`. `master` is null only if data is inconsistent (every shop is created with a master).
- **`GET /v1/platform/shops/{shopId}`**
  - `200`: `ShopRegistryEntry`.
  - `404 shop_not_found`: unknown or malformed id.
  - `401` / `403`.

## 8. Data model and migrations

No migration. It reads `shops` and `shop_memberships` (role `MASTER`) joined with `users` (`display_name`, `phone`).

Keyset pagination is by `shops.id` descending. UUIDv7 ids are time-ordered, so this is newest first.

## 9. Security and privacy

- Platform permission comes from `platform_admins` only.
- Responses contain the owner's mobile number, which the platform needs for support. It is never logged.
- Read-only: no mutation endpoints.

## 10. Acceptance criteria

- [x] Given three registered shops, when a platform admin lists with `limit=2`, then the two newest come back with a `nextCursor`, and the next page holds the oldest one with `nextCursor: null`.
- [x] Each entry has the master's name and mobile number.
- [x] Given a shop id, when a platform admin requests it, then its registry entry is returned; an unknown or malformed id gives 404.
- [x] A shop owner (non-admin) gets 403 on both endpoints; no token gives 401.
- [x] `limit=0`, `limit=51`, `limit=abc` and `cursor=not-a-uuid` give 400 with field errors.
- [x] The web list shows the empty state with no shops, and rows with name, status, owner and date otherwise; the detail page shows the same facts; an unknown id shows "Shop not found".

## 11. Test plan

- **API e2e:**
  - pagination and ordering;
  - master fields;
  - detail;
  - 404 for unknown and malformed ids;
  - 403 for a shop owner;
  - 401;
  - query validation.
- **Web unit:** the registry list component (empty state, rows, pagination links) and the date formatting.
- **Manual (local):** list, paging and detail with the shops from SHP-001.

## 12. Dependencies and open questions

- Approval, rejection and suspension: PLT-002 (question 50).
- Search and filtering by status: added with PLT-002, once there is more than one status.

## 13. Implementation notes

**API:** `src/platform-shops/`.
- `PlatformShopsController` is `@PlatformAdminOnly()` at class level and serves `GET /v1/platform/shops` (Zod query: `limit` coerced 1–50, default 20; `cursor` a UUID) and `GET /v1/platform/shops/:shopId`.
- `PlatformShopsService` paginates with a keyset on `id` descending (`limit + 1` rows fetched to detect a next page). The `REGISTRY_SELECT` it uses lists the only fields the registry may expose.
- A malformed id gets the same 404 `shop_not_found` as an unknown one.

**Web:**
- `app/platform/(console)/shops/page.tsx`: a tampered or stale cursor falls back to the first page.
- `[shopId]/page.tsx` and `not-found.tsx`, which render inside the console shell.
- `shop-registry-list.tsx`: a presentational table from `medium` and cards below it, with link-based pagination that works without JavaScript.
- **Shops** navigation item.
- `lib/api/platform-shops.ts` and `lib/format.ts` (IST dates).
- `requirePlatformAdmin()` now also returns the verified access token for page API calls.

**No migration.**

**Verified locally (2026-11-03):**
- **Unit tests:** API 60 and web 74 (7 new).
- **API e2e:** 60 tests, 12 of them new: pagination order and cursor, default page, detail, unknown/malformed id 404, five invalid queries 400, shop owner 403 on both routes, 401.
- **Checks:** lint, typecheck, Prettier, builds, migration drift; OpenAPI export includes `/v1/platform/shops` and `/v1/platform/shops/{shopId}`.
- **HTTP walkthrough with real local Supabase sessions** (11 checks):
  - the admin sees both shops from SHP-001, newest first, with owner name and mobile;
  - detail page;
  - not-found for an unknown id;
  - a tampered cursor falls back to the first page;
  - a shop owner gets no registry content and is sent to `/platform/no-access`;
  - signed out gives a 307 to the platform sign-in.
- **Logs:** no tokens, secrets or phone numbers in the API log.

**Not verified:** interactive browser rendering (skipped at the product owner's request).

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-03 | Initial feature specification |
| 2026-11-03 | Implemented and verified locally; implementation notes added |
