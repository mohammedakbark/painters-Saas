---
name: data-loading
description: How screens load data and apply changes on the web and in the Flutter apps without whole-page reloads - static shell, per-section loading, busy state on the button, partial updates and loading constant data once. Use for every screen, form, list, search or filter.
---

# Data loading and partial updates (PERF-001, D-044)

The product owner's rule: when one thing changes, only that thing shows progress and updates. The rest of the screen stays on screen and usable. Text and data that do not change are not loaded again.

## Web (`apps/admin_web`, Next.js Cache Components)

1. **Static shell first.** The page title, descriptions, section headings and labels that don't need request data render outside `<Suspense>`, so they are prerendered (`◐` in `next build`) and shown at once. Put `<Suspense>` around each **data section** with `SectionLoading` (`components/ui/section-loading.tsx`). Use `PageLoading` only when the whole page depends on one piece of data (for example a product that may not exist). Example: `app/shops/[shopId]/catalogue/shades/page.tsx`.
2. **GET search and filters never reload the document.** Use `UrlForm` / `UrlFormSubmit` / `UrlFormStatus` (`components/ui/url-form.tsx`), or `SearchForm` and `FilterForm`, which are built on them. Never write a raw `<form method="get">` in a screen. The URL changes through the client router in a transition: the old results stay until the new ones arrive, and the submit button (or the "Updating…" note for filters that apply on change) shows progress.
3. **Uncontrolled inputs that show URL state** get `key={value}` so they reset after a client navigation (for example "Clear filters"). A form holding unsaved input for a list that changes (quick add) is keyed by that list.
4. **Mutations show busy state on their own control.** Use `useActionState` / `useTransitionSubmit` / `ActionButtonForm` with `Button pending` and `pendingLabel`. After the change, the Server Action calls `refresh()` so the server parts re-render **inside the transition**: content stays on screen and no skeleton appears. Use `redirect` only when the flow moves to another page (create, then open).
5. **Load shared data once per request.** Data that several sections need (the brand list) is wrapped in React `cache()` so each request fetches it once. Data that doesn't depend on the user or the request belongs in the static shell, not in a fetch.
6. **No cross-user caching of API responses.** API calls carry the user's token and are `no-store` (`lib/api/client.ts`). Don't add `'use cache'` (shared) to anything fetched with a token. `'use cache: private'` isn't used: in production it doesn't keep data between requests (see D-044).
7. When a whole-page reload or skeleton **is** right (shop switch, sign-in or sign-out, a page whose main record changed), say why in a comment.

## Flutter (Shop App, Customer App)

1. Show a full-screen loader only on a screen's first load. After that, refreshes and saves keep the content on screen (pull to refresh, or a thin progress indicator).
2. Busy state goes on the item or action that is saving (a per-row spinner, `AppButton` loading), as `_savingPacks` and `_archiving` do in `shop_app/.../product_screen.dart`.
3. Patch the local list or model from the API response instead of refetching the whole screen. Refetch only the part that the change affects.
4. Reference data (brands, categories) is kept in the repository or controller for the session and cleared on sign-out or shop switch. It is never shared between users or shops.

## Review checklist
- No raw `<form method="get">` in screens. Search and filters use `UrlForm`, `SearchForm` or `FilterForm`.
- Static text sits outside Suspense, and there is one Suspense per independent data section.
- Every mutation has a pending state on its own control, and no page-wide skeleton appears after a save.
- No token-bearing fetch inside `'use cache'`.
- Checked in the browser: searching, filtering and saving keep the page (the document doesn't reload).
