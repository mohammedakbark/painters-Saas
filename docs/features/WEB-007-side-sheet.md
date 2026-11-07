# WEB-007: Side sheet for small forms

Status: **Part 1 complete (local; Chrome)**. Part 2 (platform admin) is next.

## Goal
Small add and edit forms open in a panel that slides in from the right over a blurred page, so the list stays in view and the work feels fast (product owner, 2026-11-07, D-051).

## Component (`components/ui/side-sheet.tsx`, `toast.tsx`)
- `SideSheet` is a native modal `<dialog>` docked right, full height, up to 36rem wide (full width on a phone). It has a header with the title, a description and Close, and a scrolling body. The backdrop is dimmed and blurred. It slides in only with `prefers-reduced-motion: no-preference`.
- **Opening and closing:** `SideSheetButton` (or `openSideSheet(id)`) opens it. `defaultOpen` supports deep links such as `?add=product`. Escape, a click outside and Close shut it, and focus returns to the button.
- **Drafts:** the form stays mounted, so a draft survives closing.
- **After a save:** forms call `useCloseSheetOnSave(state)`. When the Server Action returns `saved` (and an optional `savedLink`), the sheet closes, the form clears and a `Toast` confirms (8 s, Dismiss, optional link). The action calls `refresh()`, so only the list updates (D-044).
- **Cancel:** inside a sheet the catalogue forms' Cancel closes it (`CancelControl`).

## Screens (Part 1)
- **Products → Add product:** the CAT-005 flow (search across brands, catalogue listing or new product, photo) in a sheet. Saving shows "… added." with **Open product**. A failed photo upload is named in the toast. `/catalogue/new` redirects to `/catalogue?add=product`, and Quick start links there.
- **Shades → My shades:** the add card is gone. The tab is a table like the others, with **Add shade** in the toolbar opening the sheet.

## Part 2 (planned)
Platform admin: Add brand, categories (table, add and rename in sheets), brand shades as a table with Add shade, and Add product for a brand.

## Tests
- `side-sheet.test.tsx`: opens from its button and with `defaultOpen`; Close, Cancel, Escape and outside click close it; the draft is kept; a save closes and clears it and shows the toast.
- Chrome at 1280 px and 518 px:
  - backdrop blur;
  - a new product added through the sheet (sheet closed, row added, no document reload);
  - `?add=product` opens the sheet and Escape closes it;
  - a shade added at 518 px (toast, list updated, no reload);
  - no horizontal scroll, no console errors.
