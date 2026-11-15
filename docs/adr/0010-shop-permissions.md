# ADR 0010: Shop permissions instead of role checks

- **Status:** Accepted
- **Date:** 2026-11-15
- **Decision owners:** Product owner / Engineering

## Context

Every shop action was guarded by "is the caller the owner" (`requireShopRole(shop, ['MASTER'])`), with owner checks repeated in the web and the Shop App (`myRole == 'MASTER'`). The product owner wants shops to give employees access to only some features, each chosen by the owner with a tick box (2026-11-15), and the Shop App to show only what a person may use. Employee accounts themselves come later.

## Decision

- A fixed list of **permission keys** (`SHOP_PERMISSIONS` in `apps/api/src/shop-access/shop-permissions.ts`): `orders.handle`, `orders.payments`, `orders.record`, `customers.manage`, `catalogue.view`, `catalogue.manage`, `shop.profile`, `shop.settings`, `reports.view`, `staff.manage`.
- `ShopAccessGuard` resolves the member's permissions once per request through `ShopPermissionsResolver` and puts them on `ShopContext`. Services call `requireShopPermission(shop, key)`, or `requireAnyShopPermission` for data several jobs need (the pack list, order messages, finding a customer). The answer for a missing permission stays 403 `shop_permission_denied`; non-members still get 404.
- Today permissions are derived from the role: MASTER has all of them. No migration. The employee feature will store each employee's keys and replace the resolver's default; the API contract does not change.
- `GET /v1/shops/:shopId` (and registration) return `permissions`. Clients show or hide features from that list and ignore keys they don't know. The app fails closed when the list is missing.
- Money figures in the order summary are null without `reports.view`.

## Alternatives considered

1. **Fixed roles** (Manager, Sales, Stock). Simpler to explain, but the owner asked for per-feature tick boxes, and roles would still need a permission map inside the API.
2. **Roles with adjustments.** Most flexible, most to build; tick boxes alone cover the need.
3. **Keep role checks until employees exist.** Cheaper now, but every screen would be redone later and the app couldn't be tested with reduced access.

## Consequences

- One place decides what each key allows; adding employees is storage plus a screen, not a rewrite.
- Every protected route is covered by an e2e test that removes its permission (`test/permissions.e2e-spec.ts`, using a test resolver).
- Reads that used to be open to every member (products, shades, categories, catalogue summary, settings, customers) now need a permission, which owners always have.

## Follow-up actions

- [x] `DATA_AND_SECURITY.md` §3 and §11.
- [x] `docs/features/SHP-010-permissions.md`.
- [ ] Employee accounts: storage of permissions per member, the owner's tick-box screen, protecting the master account (question 37).
