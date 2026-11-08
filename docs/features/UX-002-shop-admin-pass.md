# UX-002: Shop admin quality pass

Status: **Complete (local; Chrome)**. Part 2 of the web quality pass (owner, 2026-11-08). It uses the UX-001 foundations.

## Changes
- **Overview:**
  - each section (status, order figures, product figures, to-dos, delivery) has its own `SectionBoundary` and a skeleton shaped like it;
  - one settings load per request;
  - tab title "Overview".
- **Menu:**
  - **Orders** shows the count of new orders (hidden when 0; a dot when the menu is collapsed). The count never blocks the console;
  - "Shop details and photo" is now **Shop profile** everywhere; "Your own shades" is now **My shades**.
- **Asks before removing:** pack sizes, archiving a product, own shades, order messages and painters' sites (`ConfirmActionButton` with a toast).
- **Feedback:** "added", "saved", "photo" and "recorded" banners are now one-time toasts (`FlashToast`) that clear the address, so a reload doesn't repeat them.
- **Loading:**
  - Products shows its title and a table skeleton;
  - Profile renders its header at once with a detail skeleton;
  - the Settings "Order messages" title no longer waits for data.
- **Customers:**
  - the empty orders list has no nested card;
  - "See all orders" opens Orders filtered to that customer, with a "Showing orders for …" chip and Clear filters.
- **Tab titles:** "Order #1029 · Orders", "Ravi Painter · Customers", "<product> · Products" (one cached load shared with the page).
- **Empty states:**
  - Products and brand shades explain what's missing and what to do;
  - table empty states no longer draw a card inside the table.
- **Review panel:** staff see "Only the shop owner can submit the shop for review."
- **Smaller fixes:**
  - Quick start has "Back to the first page";
  - the empty product or shop photo is a short dashed area, not a large blank box;
  - Settings row actions line up with the text;
  - the product page uses `gap-6` like the rest.

## Checks
- Chrome sweep of 18 shop routes at 1280 and 518 px: every page renders its title, no horizontal scroll, no console errors; unknown orders, customers and paths show the right not-found inside the console.
- Web suite 248 passed; `ui:check`, lint and build pass.

## Limits
- Sign-in still shows a service outage under the field: the sign-in step returns one message, and telling outages apart needs a change to the sign-in flow.
- Quick start pages by cursor (no numbered pages).
