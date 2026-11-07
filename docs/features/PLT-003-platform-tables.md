# Feature: Platform admin lists as tables

- **Feature ID:** PLT-003
- **Status:** Part 1 (shops and reviews) complete; Part 2 (brand catalogue) next
- **Last updated:** 2026-11-07
- **Related modules:**
  - API `platform-shops` (registry query, `ImageStore` for the photo), `shop-review` (`platform-reviews.service.ts` queue);
  - web `app/platform/(console)/shops/page.tsx`, `reviews/page.tsx`, `lib/list-params.ts`, `lib/format.ts` (`daysSince`), `components/ui/pagination.tsx`.
- **Decisions:** D-039, D-042; CLAUDE.md list and status-colour rules

## 1. Why

The platform lists were cards with "Next page" links and no search. They grow with every shop, so they follow the list rule: a table, filters in the URL, numbered pages and distinct status colours. This is the same pattern as the shop Products page (CAT-006).

## 2. Behaviour (Part 1)

- **Shops** (`/platform/shops`):
  - status tabs with counts: All · Draft (grey) · In review (blue) · Changes requested (amber) · Live (green);
  - search by shop name, owner name or mobile (Enter);
  - sort: newest, oldest, name;
  - a table with photo, shop and registration date, owner name and mobile, status and an action (**Review** for shops in review, otherwise **View**);
  - pages of 10/25/50 rows.
- **Reviews** (`/platform/reviews`):
  - search the same way; sort oldest first (the default) or newest first;
  - a table with photo, shop ("Submitted again" for resubmissions), owner, submitted time with a wait badge ("Waiting 3 days", amber from 2 days) and **Review**;
  - the empty state "No shops are waiting".
- **Paging text:** "Showing 1–1 of 1 shop" (singular when one); nothing when the list is empty.

## 3. API

- **`GET /v1/platform/shops`:**
  - query `q`, `status`, `sort` (newest, oldest, name), `page`, `pageSize` (10, 25 or 50);
  - returns `total` and `statusCounts` for the current search;
  - entries add `photoThumbUrl` (the public shop photo).
  - The cursor and limit parameters are gone.
  - The registry still returns registration facts only: no catalogue, customers or money.
- **`GET /v1/platform/reviews`:**
  - query `q`, `sort` (oldest, newest), `page`, `pageSize`;
  - returns `total`;
  - entries add `photoThumbUrl`, `ownerName`, `ownerPhone`.
- Both are paged in the database (`count`, `skip`/`take`) and are platform admins only, as before.

## 4. Local test admin

The browser checks use a **local-only** platform admin, `admin@sevenpalette.test`, created with `pnpm --filter api platform-admin:create`. Its password is in the gitignored `apps/admin_web/.env.local`, never in git.

## 5. Checks (2026-11-07, Part 1)

| Check | Result |
|---|---|
| API typecheck, lint; e2e `platform-shops` and `shop-review` (19, including search by name, owner and mobile, status filter and counts, sort, paging, validation, 403 for shop owners, queue search and total); OpenAPI exported | Passed |
| admin_web lint, typecheck, tests (including `list-params`, `daysSince`), build; `ui:check` | Passed |
| Chrome as the local test admin at 1280 px: tabs and counts, search by "sree" and by mobile, Live tab, name sort, reviews empty state; no horizontal scroll, no console errors | Verified |
