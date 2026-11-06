# Feature: Shop console in the premium style

- **Feature ID:** WEB-004
- **Status:** Complete (local verification; see §6)
- **Last updated:** 2026-11-06
- **Related modules:** `apps/admin_web`: `components/layout` (`AppShell`, `NavLinks`, `PageLoading`), `components/ui` (`PageHeader`, `Field`, `StateMessage`, `SegmentedLinks`, `Icon`), `components/shops/onboarding-checklist.tsx`, `components/shop-catalogue/shop-catalogue-forms.tsx` (`ActionButtonForm` tertiary), `app/shops/[shopId]/**`, `app/platform/(console)/layout.tsx`
- **Decisions:** D-039 (shared components), D-040 (brand), DESIGN_SYSTEM §9a (wording)

## 1. Goal

The product owner asked for the shop console (overview, profile, catalogue) in the premium style of WEB-001 to WEB-003, with careful alignment and spelling. Patterns were taken from well-known admin consoles (a setup guide with progress, a sidebar with icons and a workspace switcher, a page header with a back link, segmented filters). Their look and brand were not copied.

## 2. Console frame (shop and platform)

- **Sidebar** (desktop, sticky):
  - the SevenPalette Admin mark;
  - an area card: "Shop" and the shop name, with **All shops** back to `/shops`. The platform console shows "Admin area" and "Platform Admin";
  - icon navigation: Overview, Profile, Catalogue. The current page has a filled pill and an accent bar;
  - the account with **Sign out**.
- **Phone:** the brand and **Sign out**, then the area card, then scrollable pill navigation.
- **Main area:** cream background with white cards. Loading shows a placeholder skeleton instead of a spinner line.

## 3. Pages

- **Overview:**
  - "Overview" caption over the shop name;
  - the status card (badge, explanation, review actions);
  - "Get your shop ready" with a progress bar, a check or open circle per item, and **Add →** links;
  - cards to Shop profile and Catalogue.
  - The draft sentence that repeated the checklist was removed; the checklist and the review panel already say it.
- **Profile:**
  - each section in a card: Customer support, Shop address, Map location;
  - the shop photo in a right-hand column on desktop;
  - **Cancel** and **Save profile** aligned right (stacked on phones, Save first).
  - Fields, validation and actions are unchanged.
- **Catalogue:**
  - underline tabs (Products, Shades);
  - the search field has a search icon and the placeholder "Product or brand name" (it replaces the helper line);
  - **Selling / Archived** is a segmented control;
  - each product card has aligned pack rows (size, price with MRP, availability, a quiet **Mark available / Mark unavailable**);
  - the empty state shows an icon and both add buttons;
  - "No products match your search" now says "Try another product or brand name."
- **Sub-pages** (add from brand catalogue, add own product, product detail, add a brand product):
  - a back link in the page header replaces the underlined "All products" link;
  - brand products are one-line cards with **Choose →** or "In your catalogue" with **Edit prices**.

## 4. Wording

All console text was read through:
- spelling stays British/Indian ("catalogue", "colour");
- one fix: "secure (https) connection" became "secure (HTTPS) connection".

## 5. Security

No API, data or permission change. Every page still calls `requireShopAccess()`; the shop comes from the verified session and membership.

## 6. Checks (2026-11-06)

| Check | Result |
|---|---|
| admin_web lint, typecheck, tests (186, including `console-ui.test.tsx` for the new component props), build; `ui:check`, `tokens:check`, Prettier | Passed |
| Headless Chrome, test owner (99999 00001) with four sample products (local `catalogue:seed-sample`): overview, profile, catalogue (selling, archived, empty search), shades, add from brand catalogue, add own product, product detail, add a brand product; at 1280 px and 518 px; sidebar at 2× zoom; no horizontal scroll, no console errors | Verified |
| Platform console in the new frame | Unit test and build only; the local platform admin password was not available, so it was **not** checked in a browser |
