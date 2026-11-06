# Feature: Console navigation v2 and row actions

- **Feature ID:** WEB-005
- **Status:** Complete (local verification; see §4)
- **Last updated:** 2026-11-06
- **Related modules:** `apps/admin_web`: `components/layout/app-shell.tsx`, `nav-links.tsx`, `components/ui/menu.tsx`, `confirm-dialog.tsx`, `icon-button.tsx`, `button.tsx` (destructive), `app/shops/[shopId]/layout.tsx`, `app/shops/[shopId]/catalogue/row-actions.tsx`
- **Decisions:** D-039 (shared components), D-042 (responsive admin); owner guidance 2026-11-06 (FEATURE_CATALOG §4)

## 1. Behaviour

**Sidebar (desktop):**
- **Collapsing:** the control at the bottom collapses the sidebar to icons (72 px), with each label as a tooltip. The choice is remembered on this device.
- **Shop switcher** at the top: the current shop; a menu with the user's shops (current one ticked), All my shops, Register a shop. The platform console shows its area without a switcher.
- **Navigation:** Overview · Products · Shades. Products is not highlighted on Shades. Orders, Categories, Users and Mobile Apps appear when those modules exist.
- **Account menu** at the bottom: "Signed in as …", Shop details and photo (the shop profile), My shops, Sign out.

**Phones and tablets:** a top bar with the brand and the account menu, the shop switcher, and the scrollable navigation pills.

**Catalogue rows:** a ⋯ menu per row:
- Edit prices and details;
- Mark available / Mark not available;
- Archive product (asks first, with a red confirm button);
- archived rows offer Restore instead.

The menu is shown to the owner only, and the API checks the role again.

**Also:**
- The Products and Shades pages have their own titles; the in-page Products/Shades tabs are gone because the sidebar has both.
- Below `desktop`, the table's filters sit two per row.

## 2. Components

- **`Menu`**, with `MenuLink`, `MenuButton`, `MenuSeparator` and `MenuLabel`. It closes on Escape, on a click outside and after a choice.
- **`ConfirmDialog`**: a native modal `<dialog>`.
- **`IconButton`**.
- **`Button` `destructive` variant.**

## 3. Not done (by design)

- **Hard delete:** products are archived, not deleted (open question 55).
- **Sections without modules:** Orders, Categories, Users and Mobile Apps are not shown.

## 4. Checks (2026-11-06)

| Check | Result |
|---|---|
| admin_web lint, typecheck, tests (204, including the shell switcher, account menu and collapse, and the row menu with archive confirmation), build; `ui:check` | Passed |
| Chrome at 1280 px and 518 px: navigation highlight, shop switcher items, row menu items, archive dialog opens and cancels, sidebar collapses to 72 px and stays collapsed after reload, account menu items; no horizontal scroll, no console errors | Verified |
