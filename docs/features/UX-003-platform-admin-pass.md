# UX-003: Platform admin quality pass

Status: **Complete (local; Chrome)**. Part 3 of the web quality pass (owner, 2026-11-08).

## Changes
- **Overview:**
  - a real dashboard: "Waiting for review" (with how long the oldest has waited and a "Needs attention" badge), Live, Changes requested and Draft shops, and active brands, products and shades;
  - each figure opens the list behind it;
  - the figures load and fail on their own.
- **API:** `GET /v1/platform/summary` (platform admins only; counts, no names or contacts). E2e: counts and 403 for shop owners.
- **Menu:** **Reviews** shows how many shops are waiting; a failure never blocks the console.
- **One header pattern:**
  - review, shop, brand, categories and product pages use the `PageHeader` back link;
  - status badges sit in the header description;
  - review detail shows "Submitted again" in a different colour from "In review".
- **Shop page:** "Review now" (primary) only while the shop is in review, otherwise a quiet "Review history".
- **Decisions:** after approving or requesting changes, the queue shows a toast naming the shop. There's no lasting banner in the address.
- **Empty states:** "No shop photo" and "No products yet" are proper empty messages, and history says "No earlier submissions."
- **Consistency:**
  - categories load with a table skeleton and have a right-aligned order column;
  - the import page fits phones (no horizontal scroll), and form dropdowns never grow wider than their box;
  - grid gaps and card padding match the rest;
  - "No platform access" offers "Go to your shops".
- **Neutral badges** (Draft, Unpaid, Completed) now have a white fill and border, so they read on the cream page as well as on cards.

## Checks
- **Chrome sweep:** 12 platform routes at 1280 and 518 px; titles render, no horizontal scroll, no console errors; an unknown review and an unknown platform address show not-found inside the console.
- **Tests:** web suite 248; API e2e 155 (full suite); `ui:check`, lint and build pass.

## Limits
- Shop and product pages still use generic tab titles ("Shop", "Brand").
- Categories have no search or pages (there are few of them).
