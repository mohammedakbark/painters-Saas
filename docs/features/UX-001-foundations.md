# UX-001: UI foundations for states and layout

Status: **Complete (local)**. Part 1 of the web quality pass requested by the product owner (2026-11-08) before the mobile apps.

## What changed
- **Errors keep the console:**
  - `app/shops/[shopId]/error.tsx` and `app/platform/(console)/error.tsx` render inside the console with Try again and Go to Overview;
  - the outer boundaries and the new root `app/error.tsx` fill the window for pages outside a console.
- **Section errors:** `SectionBoundary` lets one section fail while the rest of the page works.
- **Not found:** in-console pages for orders, customers, reviews and unknown platform pages, plus a branded root `app/not-found.tsx`.
- **API timeout:** `apiRequest` aborts after 12 s (45 s for uploads) and reports `ApiUnavailableError`.
- **Loading:** `Skeleton` and shaped skeletons (table, detail, tiles, lines); `SectionLoading` and `PageLoading` are built on them.
- **Layout:** `Section`, `DetailList`, and `StateMessage variant="plain"`.
- **Feedback:**
  - `ToastHost` in the shared `AppShell` (both consoles);
  - `ConfirmActionButton` for remove and archive;
  - an `alertCircle` icon for errors.

Pages adopt these in UX-002 (shop admin) and UX-003 (platform admin). Rules are in DESIGN_SYSTEM §12.

## Tests
- `components/ui/foundations.test.tsx`: section failure with retry; redirects pass through; skeleton label; Section and DetailList; plain empty state; confirm then toast.
- `lib/api/client.test.ts`: timeout becomes `ApiUnavailableError`.
- Web suite 248 passed, plus `ui:check`, lint and build.
