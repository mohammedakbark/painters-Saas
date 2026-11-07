# PERF-001: Partial updates instead of whole-page reloads

Status: **Complete (local; Chrome, production build)**. Decision D-044. Rules: `.claude/skills/data-loading/SKILL.md`.

## Problem
On the shop admin web, searching shades, choosing a filter or a page size, and the Quick start brand search reloaded the whole browser document. The sidebar, header and every section disappeared and then loaded again. The cause was native `<form method="get">` submissions. Link navigation and Server Action buttons already kept the page and showed busy state on the button; this was checked in Chrome before the change.

## What changed
- **`UrlForm`, `UrlFormSubmit`, `UrlFormStatus`** (`apps/admin_web/src/components/ui/url-form.tsx`): a GET form that pushes its values (empty ones left out) to the URL through the client router inside a transition. Without JavaScript it is still a normal GET form.
- **`SearchForm`** and **`FilterForm`** are built on it, so every platform and shop list (products, platform shops, reviews, brands, brand products, brand shades) filters without a reload. The submit button shows "Searching…". Filters that apply on change show a small "Updating…" note on the filter card that takes no space when idle.
- Filter and search inputs are keyed by their URL value, so "Clear filters" and the back button show the current state after a client navigation.
- **Shades page:** the title, intro and section headings are in the prerendered shell. Favourites, brand shades and your own shades each load behind their own `SectionLoading`. The brand list is fetched once per request (`cache()`). "Find shades" uses `UrlForm`.
- **Quick start:** the brand and search form uses `UrlForm`. The quick-add form is keyed by brand and search, so typed prices never carry over to another list.
- **`SectionLoading`** (`components/ui/section-loading.tsx`): a skeleton for one section.

## Not done (by design)
- `'use cache: private'` for reference data: in Next.js 16 production it does not keep data between requests, so it would not avoid a fetch (D-044).
- Flutter: the Shop App already keeps busy state per item. The rules are in the skill for new screens; no Flutter code changed.

## Checks
- `tsc`, ESLint, Vitest (216 tests, including new `SearchForm` tests for the client-router submit), `pnpm ui:check`, `next build`.
- Chrome against the production build (`next start`): "Find shades" and the product filters keep the document (the page probe survives); only the button or the "Updating…" note is busy; "Clear filters" resets the selects; adding and removing an own shade shows busy state only on the button.
