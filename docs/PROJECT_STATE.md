# Project State — Living Document

**Last updated:** 2026-11-05  
**Current stage:** Phase 1: shop onboarding. Identity and shop accounts done (AUTH-001, SHP-001, PLT-001, SHP-002). The product owner answered the onboarding and catalogue questions on 2026-11-04 (D-027 to D-034). DS-001 (single-source theme), SHP-003 (shop profile and map location), SHP-004 (shop photo, portable storage), CAT-001 (platform brand catalogue), CAT-002 (shop catalogue) and PLT-002 (shop review) done: a shop can now go from registration to Live locally. DS-002 (the project's own UI components, D-039) and SHP-005 (Shop App catalogue) done: Phase 1 is complete. Before Phase 2 the product owner asked for a UI/UX pass on the web: WEB-001 (public home page) done; next WEB-002 (sign-in and registration UX), then plan the Customer App foundation (D-036 to D-038 recorded).  
**Overall status:** Foundation complete with CI green on GitHub. Implemented and verified locally: platform admin sign-in, shop self-registration with tenant-scoped access, the platform shop registry, and Shop App sign-in (Android emulator).  
**Product name:** SevenPalette (D-040, 2026-11-06), a product of zero.byt

> Claude Code must read this file before every task and update it after every completed task or meaningful project change.

## 1. Current milestone

**M1: Identity and shop accounts.** Built and verified one feature at a time. On 2026-11-03 the product owner changed the shop model (D-024 to D-026): shops **self-register**, and a platform admin approves them after the onboarding checklist.

| Feature | Status | Spec |
|---|---|---|
| AUTH-001: Platform admin sign-in, plus auth and API conventions | **Complete (local)**; commit `3697e4f` | `docs/features/AUTH-001-platform-admin-sign-in.md` |
| SHP-001: Shop owner registration and sign-in (web), tenant-scoped access | **Complete (local)** | `docs/features/SHP-001-shop-registration-and-sign-in.md` |
| PLT-001: Platform shop registry (read-only list and detail of registered shops) | **Complete (local)** | `docs/features/PLT-001-platform-shop-registry.md` |
| SHP-002: Shop App sign-in (Flutter, login-only) | **Complete (local, Android emulator)** | `docs/features/SHP-002-shop-app-sign-in.md` |
| DS-001: Single-source design tokens and brand names (D-034) | **Complete (local)** | `docs/features/DS-001-design-tokens.md` |
| SHP-003: Shop profile, address and map location (D-027) | **Complete (local; Chrome + Android emulator)**. Google map rendering not verified (no keys yet) | `docs/features/SHP-003-shop-profile-and-location.md` |
| SHP-004: Shop photo and portable media storage (D-028) | **Complete (local; Chrome + Android emulator + local Supabase Storage)** | `docs/features/SHP-004-shop-photo.md`, ADR 0007 |
| CAT-001: Platform brand catalogue (D-030) | **Complete (local; Chrome)** | `docs/features/CAT-001-platform-brand-catalogue.md`, ADR 0008 |
| CAT-002: Shop catalogue (D-029, D-030) | **Complete (local; Chrome)** | `docs/features/CAT-002-shop-catalogue.md` |
| PLT-002: Review workflow: submit, approve or request changes, resubmit (D-032, D-033) | **Complete (local; Chrome owner side, platform side over HTTP, Android emulator)** | `docs/features/PLT-002-shop-review.md` |
| DS-002: The project's own UI components with component tokens and a CI guard (D-039) | **Complete (local; Chrome shop pages, Android emulator)** | `docs/features/DS-002-components.md` |
| SHP-005: Shop App catalogue: products, availability, prices, pack sizes, archive, add from brand catalogue, photos | **Complete (local; Android emulator against the real API, Chrome cross-check)** | `docs/features/SHP-005-shop-app-catalogue.md` |
| WEB-001: Public home page (product site with Sign in/Register; no platform admin entry), poster palette, pill buttons, footer with "Powered by zero.byt" | **Complete (local; headless Chrome over CDP)**; merged into `dev` 2026-11-05; copy drafts awaiting product-owner review | `docs/features/WEB-001-public-home-page.md` |
| WEB-002: Sign-in and registration UX (separate Sign in and Register, 2 steps, +91 field, self-submitting code, resend countdown) | **Complete (local; real flow in headless Chrome)** | `docs/features/WEB-002-sign-in-and-registration.md` |
| WEB-003: Your shops screen (brand bar, welcome band, shop cards, getting-started steps, loading cards) | **Complete (local; real flow in headless Chrome)** | `docs/features/WEB-003-my-shops.md` |
| WEB-004: Shop console in the premium style (sidebar with area card and icons, page header back link, skeleton loading, setup guide with progress, profile cards, catalogue tabs/search/segmented filter/aligned pack rows) | **Complete (local; headless Chrome)**; platform console frame not browser-checked | `docs/features/WEB-004-shop-console.md` |
| SHP-006: Maps on OpenStreetMap (D-041): web map with search, pin and address suggestion; Shop App map preview; Google Maps removed | **Complete (local; real services in headless Chrome)**; Shop App map not checked on an emulator | `docs/features/SHP-006-openstreetmap.md` |
| DS-004: Required-field marker (red asterisk, spoken "required", one note per form) on web and Flutter forms | **Complete (local)** | `docs/features/DS-004-required-fields.md` |
| CAT-003: Catalogue table (one row per pack, Litres/Kilograms/Pieces tabs, a filter per column, pagination, sort) and distinct status colours | **Complete for the shop admin web (local)**; platform admin, Shop App and Customer App next, in that order | `docs/features/CAT-003-catalogue-table.md` |
| WEB-005: Console navigation v2 (collapsible sidebar, shop switcher, account menu) and the catalogue row ⋯ menu with archive confirmation | **Complete (local; Chrome)** | `docs/features/WEB-005-console-navigation-and-row-menu.md` |
| CAT-004: Quick add: prices for many brand products in one form, progress toward 10 products | **Complete (local; Chrome)** | `docs/features/CAT-004-quick-add-products.md` |
| CAT-005: One Add product flow (search every brand, locked brand details, new product with "Sold by", optional photo) | **Complete (local; Chrome)** | `docs/features/CAT-005-add-product.md` |
| CAT-006: Product list: one row per product with photo, pack-size chips, availability summary, toolbar filters and "mark all" actions | **Complete (local; Chrome)** | `docs/features/CAT-006-product-list.md` |
| WEB-006: Shades as tables (Favourites, Brand shades, My shades; search and pages) | **Complete (local; Chrome)** | `docs/features/WEB-006-shades-table.md` |
| WEB-007: Side sheet for small forms (D-051): shop Add product and Add shade; platform Add brand, categories, brand shades table and Add product | **Complete (local; Chrome)** | `docs/features/WEB-007-side-sheet.md` |
| SHP-008: Shop settings: pickup and delivery (charge, free-above, km distance) and order messages | **Complete (local; Chrome)** | `docs/features/SHP-008-shop-settings.md` |
| CAT-007: Shop categories (D-048): own categories next to the platform's, used by own products | **Complete (local; Chrome)** | `docs/features/CAT-007-shop-categories.md` |
| WEB-008: Overview dashboard v1: status, product stat tiles, to-dos, pickup and delivery | **Complete (local; Chrome)** | `docs/features/WEB-008-overview-dashboard.md` |
| ORD-001: Orders data and shop orders API (D-053, D-054): five steps, not available, substitutes, payment, returns, test-order script | **Complete (local; API e2e)** | `docs/features/ORD-001-orders-api.md` |
| INFRA-001: Free test hosting (D-052, ADR 0009): Render API from `render.yaml`, Vercel web, Supabase Free, deploy on merge to `main`, keep-alive workflow | **Live (2026-11-08)**: web https://sevenpalette-test.vercel.app, API https://sevenpalette-api.onrender.com (`/health/ready` ok, migrations applied), keep-alive run green. Platform admin not yet created on the hosted project | `docs/guides/DEPLOYMENT.md`, ADR 0009 |
| PLT-003: Platform admin lists as tables (Part 1: shops and reviews; Part 2: brand catalogue) | **Complete (local; Chrome)** | `docs/features/PLT-003-platform-tables.md` |
| PERF-001: Partial updates: search and filters without page reloads (`UrlForm`), per-section loading on Shades, project-wide loading rules (D-044, `data-loading` skill) | **Complete (local; Chrome, production build)** | `docs/features/PERF-001-partial-updates.md` |
| DS-003: SevenPalette name and shade-card fan logo (D-040): names, logo files, web and Flutter brand mark, favicon, launcher icons | **Complete (local)**; Android emulator not run | `docs/features/DS-003-product-name-and-logo.md` |

**Git (D-035):** every feature above is in `dev` (fast-forward merged and pushed on 2026-11-04; one commit per feature, `3697e4f` … `9c7885b`); the local per-feature branches were deleted. The first GitHub Actions run on `dev` (`8497b81`) passed all three jobs (TypeScript, Flutter, repository checks). The old remote branch `feat/shp-002-shop-app-sign-in` is still on GitHub (its commits are in `dev`); the product owner can delete it. From now on each finished feature is merged into `dev` and pushed the same way. `main` still holds only `c56f614` (project setup) until a release.

**M0: Project foundation** is `DONE`. The first commit (`c56f614`, pushed by the product owner) ran the `CI` workflow on GitHub with all three jobs green under Node 24.

## 2. Actual repository structure

```text
.github/workflows/ci.yml          CI (typescript, flutter, repository jobs)
apps/admin_web/                   Next.js 16 portal: platform sign-in + console shell; shop OTP sign-in, my shops, register a shop, shop console shell; UI components
apps/api/                         NestJS 12 API: auth guard (JWKS), /v1/me, platform-admin guard + operator script, shops + shop-access guard, audit, problem errors
apps/customer_app/                Flutter shell (android, ios): placeholder screen + widget test
apps/shop_app/                    Flutter Shop App: OTP sign-in (Supabase), shop list, shop home, profile, catalogue (products, prices, pack sizes, availability, photos), secure session storage (Riverpod, go_router, Dio, image_picker)
packages/design_tokens/           tokens.json + brand.json (single source, incl. component tokens), the generator for the web theme and Flutter tokens, and the component guard (pnpm ui:check)
packages/flutter_shared/          Generated tokens + AppBrand, AppTheme.light(), UI components (AppButton, AppTextField, AppDropdown, sheets, dialogs, snack bars, …), BrandMark, Inter 4.1 fonts, IndianMobileNumber, Loading/Message/Error views
packages/api_contracts/           Generated openapi.json (health, /v1/me, /v1/shops*, /v1/platform/shops*)
infra/local/                      Docker Compose Postgres 17 for app data (dev + separate test DB)
infra/supabase/                   Supabase CLI config: Auth + Storage (S3 protocol, public `shop-media` bucket), test OTPs, local ES256 signing key (gitignored)
docs/  prompts/  .claude/skills/  CLAUDE.md  README.md
```

Details, commands and environment variables: `docs/TECHNICAL_ARCHITECTURE.md` §14. Decisions: ADR 0004–0006.

## 3. Versions in use

- **Runtime and tooling:**
  - Node 24 LTS (pinned; the local machine still runs 22.21.0, CI runs 24)
  - pnpm 12.16.1
  - TypeScript ~6.0.3
  - Prettier 3.9.10
- **API:** NestJS 12.3.2 · Prisma 7.10.1 · Zod 4.6.7 · jose 6.2.15
- **Web:** Next.js 16.4.3 · React 19.3.0 · Tailwind CSS 4
- **Supabase:** supabase-js 2.118.0 · @supabase/ssr 0.12.7 · Supabase CLI 2.122.0 (GoTrue v2.197.0)
- **Testing:** Vitest 5.0.5
- **Flutter:** 3.47.9 / Dart 3.13.7 via FVM 4.3.2
- **Database:** PostgreSQL 17

## 4. Done

- [x] Product, design, security and workflow documentation; Claude Code skills.
- [x] M0 foundation: monorepo, toolchains, local Postgres, quality checks, CI (green on GitHub).
- [x] Phase 0 decisions:
  - Supabase Auth (D-021);
  - sign-in methods (D-022);
  - platform-admin-only shop creation for the first build (D-023);
  - API conventions (ADR 0006).
- [x] AUTH-001:
  - first migration (`users`, `platform_admins`, `audit_events`);
  - JWKS token verification;
  - deny-by-default API;
  - `GET /v1/me`;
  - platform-admin guard and operator script;
  - RFC 9457 errors;
  - web platform sign-in, console shell, no-access and error states;
  - local Supabase Auth stack.
- [x] Shop model decisions:
  - self-registration on the web (D-024);
  - approval after the onboarding checklist (D-025);
  - one person may master several shops (D-026).
- [x] SHP-001:
  - migration `shops` + `shop_memberships` (one master per shop);
  - `POST /v1/shops`, `GET /v1/shops/:shopId` and memberships in `/v1/me`;
  - `ShopAccessGuard` with cross-tenant tests;
  - web mobile-OTP sign-in, my shops, register a shop, shop console shell, not-found and error states;
  - Supabase sign-up enabled;
  - the operator script no longer promotes existing accounts.
- [x] PLT-001:
  - read-only platform shop registry: `GET /v1/platform/shops` (cursor pagination) and `GET /v1/platform/shops/:shopId`;
  - web `/platform/shops` list (table and cards) and detail;
  - **Shops** navigation item.
- [x] SHP-002:
  - Shop App mobile-OTP sign-in (login-only), shop list, shop home and sign-out;
  - session in the platform keystore;
  - shared Flutter state views and mobile parser;
  - verified on the Android emulator against the local stack.
- [x] Product answers on 2026-11-04: address on a Google map with current location (D-027), free tiers and replaceable providers (D-028), availability per pack (D-029), platform brand catalogues plus shop products and shades (D-030), painter discount and commission options (D-031), request changes with reasons (D-032), edit lock only during review (D-033), single-source theme (D-034).
- [x] DS-001:
  - `packages/design_tokens` (`tokens.json`, `brand.json`) generates the web `@theme` and the Flutter token and brand classes;
  - WCAG AA check in the generator; `pnpm tokens:check` in CI;
  - `BrandMark` on web and Flutter, one font module on the web, title template;
  - Tailwind default container sizes replaced by token widths.
- [x] SHP-003:
  - migration `shp_003_shop_profile` (support mobile, structured address, location with source; CHECK constraints);
  - `GET/PUT /v1/shops/:shopId/profile`, `PUT …/location`, `GET …/onboarding`; MASTER-only writes; audit with field names only;
  - web profile page with a Google map picker (no-key fallback) and "Use my current location"; onboarding checklist on the overview;
  - Shop App profile screen with `ShopLocationMap` and "Use my current location" (system location provider on Android);
  - verified in Chrome and on the Android emulator; four issues found there and fixed (see the spec, §13).
- [x] SHP-004 and ADR 0007 (provider portability, free tiers):
  - `ObjectStorage` port with an S3-protocol adapter (local Supabase Storage now; Supabase Storage or Cloudflare R2 by configuration);
  - image pipeline (sharp): real-format check, orientation, all metadata incl. GPS removed, WebP 1600 px + 480 px;
  - `PUT /v1/shops/:shopId/photo` (MASTER, audited), photo in the profile and the checklist;
  - web photo upload with preview; Shop App shows the photo;
  - `pnpm supabase:start` also seeds the storage bucket.
- [x] CAT-001 and ADR 0008 (catalogue model):
  - brand catalogue tables (categories, brands, products with pack sizes, shades) with case-insensitive uniqueness and CHECK constraints;
  - platform management API, all-or-nothing CSV import with dry run, product images, read API for signed-in users (active entries only);
  - platform console **Catalogue** (brands, categories, products, shades, import with templates);
  - platform console pages read data inside page-level Suspense (instant navigation);
  - `pnpm --filter api catalogue:seed-sample` loads a fictional sample brand for local use.
- [x] CAT-002 (shop catalogue):
  - tenant-owned `shop_products`, `shop_product_packs` (composite FK to the shop's own product), `shop_shades`, `shop_favourite_shades`;
  - products from the brand catalogue or the shop's own, per-pack price/MRP in paise (price ≤ MRP) and availability (D-029), photos, archive/restore;
  - favourite brand shades and own shades;
  - onboarding checklist **Products** item (10 active products with a pack size);
  - shop portal **Catalogue** (products, add from brand catalogue, own product, product page, shades);
  - fix to CAT-001: shade search kept on later pages.
- [x] PLT-002 (shop review):
  - statuses Draft → In review → Live or Changes requested; `shop_reviews` history with one open review per shop;
  - submit (complete checklist only), withdraw, approve, request changes with reasons and a note; resubmission;
  - profile, location and photo locked while in review (D-033), products never locked;
  - platform **Reviews** queue and audited review page; owner status panel; Shop App status and requested changes.
- [x] DS-002 (D-039, the product owner's request to make every control a project component):
  - component tokens in `tokens.json` (control, card, panel, sheet, dialog, snack bar, badge, button variants, …) generated into web utilities and `AppComponentTokens`;
  - web `Card`, `CardList`, `CardLink`, `Panel`, `SearchForm`, `FileField`, radio and checkbox groups; every screen moved onto the components;
  - Flutter `AppButton`, `AppTextField`, `AppSearchField`, `AppDropdown`, switch/checkbox/radio/segmented rows, `AppCard`, `AppSection`, `AppNavRow`, `AppBadge`, `AppInlineMessage`, `showAppSnackBar`, `showAppBottomSheet`, `showAppDialog`, `showAppConfirmDialog`, `AppSpinner`, `AppNetworkImage`; the Shop App uses only these;
  - `pnpm ui:check` in CI blocks raw controls in screens.
- [x] Product owner answers for the Customer App on 2026-11-04: painter type chosen by the customer, painter-only information per shop confirmation (D-036); browse any Live shop, add to My Shops instantly (D-037); find shops nearest first or by district (D-038).
- [x] SHP-005 (Shop App catalogue, "everyday tasks"):
  - product list with Selling/Archived, search and Load more;
  - product page: availability switch (saved state only), price and MRP sheet, add/remove pack sizes, archive/restore, photo from the camera or gallery (resized to 2400 px JPEG; `image_picker` 1.2.4);
  - add from the brand catalogue (brand, search, packs pre-ticked with prices);
  - rupee helpers in `flutter_shared` shared with the Customer App; API unchanged.

- [x] WEB-001 (public home page, 2026-11-05): product site at `/` (what the platform provides, vision and mission, painters, how a shop goes live, privacy, store buttons "Coming soon", FAQ); Login/Register to `/sign-in`; platform admin link removed (`/platform/sign-in` by URL); new `StoreButton`. Premium experience pass the same day: icons (`Icon`), `typography.hero` token, scroll progress, header elevation and section highlighting, reveal-on-scroll, phone menu; all motion respects reduced-motion settings.

## 5. Not done

- [x] Maps without Google keys: OpenStreetMap since SHP-006 (D-041, 2026-11-06). Before launch, move map tiles to a hosted provider (`docs/guides/MAPS.md`).
- [ ] PLT-002 decision form submitted from a browser by a platform admin (verified over HTTP and the API; the session could not use the test admin password in Chrome).
- [ ] Decision notifications to the owner (SMS/push; question 53).
- [ ] Product owner to confirm two CAT-002 assumptions: the selling price may not exceed the MRP, and the 10-product rule counts active products with at least one pack size (DECISIONS §3a).
- [ ] Real brand catalogue data (platform admins, from official shade cards and price lists; D-030).
- [ ] Product owner to review the WEB-001 copy (vision, mission, hero). Replace the home-page illustrations with real app screenshots and add more content (product owner request, 2026-11-05). Fill `src/lib/app-stores.ts` when the apps are published. After the name is confirmed: real footer pages and accounts (privacy policy, terms, about, contact, WhatsApp, Instagram, LinkedIn) in `src/lib/site-links.ts`.
- [ ] Hosted storage provider and credentials (ADR 0007): chosen with the first hosted environment.
- [ ] Product answers: questions 49 (registration limit), 51 (email sign-up mitigation), 52 (tinting workflow) and 53 (notification channel).
- [ ] Production SMS vendor + DLT registration (question 46). Platform admin MFA and password reset (question 47). Session policy after sign-out (question 48).
- [ ] Hosting approved or any cloud resource created: none exists, including no Supabase project.
- [ ] Final app identifiers (currently `com.example`).
- [ ] Customer App features (registration, discovery, ordering); the Shop App now uses Riverpod, go_router, Dio and supabase_flutter.
- [ ] Playwright browser tests. (Interactive walkthroughs now run in the product owner's Chrome through Claude in Chrome, since SHP-003.)
- [ ] iOS build verification (requires macOS).

## 6. Checks run (local, Windows 11, Node 22.21.0)

### SHP-005 (2026-11-04)

| Check | Result |
|---|---|
| `fvm flutter analyze`, `dart format` (lib, test) | No issues / clean |
| `fvm flutter test`: shop_app 70 (36 new: 23 widget, 13 unit), flutter_shared 64 (3 new), customer_app 1 | Passed |
| `pnpm ui:check` (102 files), `pnpm tokens:check` | Passed |
| `fvm flutter build apk --debug`; APK checked for the local secret values (551 files) | Passed; none found |
| **Android emulator** (`emulator-5554`, real local API): list and thumbnails, availability off/on, price above MRP refused, price and MRP saved, own pack 5 kg added and removed (confirm dialog), last pack refused, archive (confirm) and restore, photo from the gallery and from the emulator camera, add from the brand catalogue (2 of 3 packs) and add the third pack from the catalogue | Verified |
| **Chrome** (this computer): the web catalogue shows the app's changes (new product with 3 prices, MRP ₹120, availability, the camera photo) | Verified |
| API log: no tokens, phone numbers or image data | Verified |
| No-connection state on the emulator | **Not verified** (the open connection survived removing the port forward); covered by widget tests |
| API e2e, web | Not re-run (no API or web change) |
| iOS | **Not run** (requires macOS) |

### DS-002 (2026-11-04)

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm tokens:check`, `pnpm ui:check` (90 files), `pnpm lint`, `pnpm typecheck` | Passed |
| `pnpm test`: api 116, admin_web 149 (6 new), design_tokens 29 (14 new: component tokens, guard rules, repository clean) | Passed |
| `pnpm --filter admin_web build`; built CSS contains `rounded-control`, `min-h-control`, `rounded-card`, `rounded-panel`, `divide-card-border`, `file:min-h-control`, button colour utilities | Passed |
| Flutter: `fvm flutter analyze`, `dart format` (lib, test), `fvm flutter test`: flutter_shared 61 (19 new), customer_app 1, shop_app 34; `build apk --debug` | Passed |
| **Chrome** (this computer, local test owner): your shops, overview, catalogue, shades, profile (photo frame, file chooser, form, no-map note); computed radii 16/12 px, heights 48 px and colours unchanged; no console errors | Verified |
| **Android emulator** (`emulator-5554`): sign-in (both steps), shop list, home (status badge), profile, location loading state and error message; button labels in Inter after a fix found here | Verified |
| Platform console pages in Chrome (catalogue search, CSV import, review decision form) | **Not verified** (no platform admin sign-in in this session); covered by component tests, typecheck and build |
| Location confirmation dialog on the emulator | **Not verified** (no location fix from the emulator this run); covered by widget tests |
| API e2e | Not re-run (no API change) |

### PLT-002 (2026-11-04)

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm tokens:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test`: api 116, admin_web 143 (8 new), design_tokens 15 | Passed |
| `pnpm --filter api test:e2e`: 121 (6 new: checklist gate, lock, withdraw, request changes → resubmit → approve, validation, access) | Passed |
| `db:check-drift`; OpenAPI export (6 new paths, none removed) | No difference / updated |
| Shop App: `fvm flutter analyze`, `dart format lib test`, `fvm flutter test` (34, 2 new), `build apk --debug` | Passed |
| Secret scan of the web bundle and the debug APK | None found |
| **Chrome** (this computer, local test owner): submit, lock on the profile page, changes requested shown, photo fixed, resubmit, withdraw, resubmit, Live | Verified |
| Platform side over HTTP + API (local test admin; password read by a local script, never printed): queue, review page, registry link, decisions, 409 on a second decision, history | Verified |
| **Android emulator** (`emulator-5554`): shop list and home show Live | Verified |

### CAT-002 (2026-11-04)

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm tokens:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test`: api 116, admin_web 135 (18 new), design_tokens 15 | Passed |
| `pnpm --filter api test:e2e`: 115 (18 new: 17 shop catalogue incl. two-shop isolation on every route, 1 CAT-001 shade-search fix) | Passed |
| `db:check-drift`; OpenAPI export (11 new `/v1/shops/{shopId}/catalogue/**` paths, none removed) | No difference / updated |
| Secret scan of the web bundle (storage and service keys) | None found |
| **Chrome** (this computer, local test owner): add from brand catalogue with price > MRP error, own product with field errors, pack price/availability/remove/add, quick toggle, search, archive, favourites, own shade, product photo, checklist "2 of 10", other shop → Shop not found, unknown product → Product not found, no console errors | Verified |
| Flutter | Not re-run (no Flutter changes) |

### CAT-001 (2026-11-04)

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm tokens:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test`: api 116 (27 new), admin_web 117 (9 new), design_tokens 15 | Passed |
| `pnpm --filter api test:e2e`: 97 (14 new: management, duplicates, validation, pack replacement, pagination, shades, image, 403/401, read API active-only, CSV dry run/apply/rollback/header/products) | Passed |
| `db:check-drift`; OpenAPI export (`/v1/platform/catalogue/**`, `/v1/catalogue/**`) | No difference / updated |
| `catalogue:seed-sample` twice (43 rows, then nothing) | Passed |
| **Chrome** (this computer, platform admin): brands, duplicate refused, brand/product/shade created, pack error kept values, image upload, pack replacement, CSV bad → 2 problems, good → imported, templates, console navigation without warnings | Verified |
| Flutter | Not re-run (no Flutter changes) |

### SHP-004 (2026-11-04)

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm tokens:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test`: api 89 (14 new: image pipeline, storage env), admin_web 108 (7 new), design_tokens 15 | Passed |
| `pnpm --filter api test:e2e`: 83 (11 new: upload, metadata stripped, replacement, rejections, 413, 503, cross-tenant, 401, CHECK) | Passed |
| `db:check-drift`; OpenAPI export (`PUT …/photo`, `ShopProfile.photo`) | No difference / updated |
| `fvm flutter analyze`, `dart format`, `flutter test` (shop_app 32, flutter_shared 42, customer_app 1), `flutter build apk --debug` | Passed |
| actionlint 1.7.12 on `ci.yml` (storage placeholders) | 0 errors |
| **Chrome** (this computer): upload with preview, "Photo saved", checklist 4/4, replacement upload | Verified |
| Local Supabase Storage over HTTP: WebP, 1600×1200 and 480×360, immutable cache header, no EXIF/GPS, old objects gone after replacement | Verified |
| **Android emulator**: photo shown on the shop profile (`adb reverse tcp:54321 tcp:54321`) | Verified |
| No Supabase or storage secret in the APK, web bundle or API log | Verified |

### SHP-003 (2026-11-04)

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm tokens:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test`: api 75 (15 new), admin_web 101 (25 new), design_tokens 15 | Passed |
| `pnpm --filter api test:e2e`: 72 (12 new: profile round trip, validation, audit without values, location endpoint, cross-tenant on all four routes, platform admin and no-shop user, constraints) | Passed |
| `db:check-drift`; OpenAPI export (profile, location, onboarding documented) | No difference / updated |
| `fvm flutter analyze`, `fvm dart format` (lib, test) | No issues / clean |
| `fvm flutter test`: shop_app 31 (12 new), flutter_shared 42 (2 new), customer_app 1 | Passed |
| `fvm flutter build apk --debug`; merged manifest has the location permissions and an empty Maps key | Passed |
| **Chrome** (this computer, Claude in Chrome): OTP sign-in, checklist 0/3, PIN error with values and State kept, device location (imprecise result refused, 149 m accepted), save, checklist 3/3, console navigation without warnings, owner B sees "Shop not found" for owner A's profile | Verified |
| HTTP check: owner B's responses contain none of owner A's profile values (incl. RSC payload) | Verified |
| **Android emulator**: web-saved profile shown, permission denied → retry → allowed, Google accuracy prompt declined, test GPS position saved after confirmation; DB holds `DEVICE_GPS`, audit holds the source only | Verified |
| No secret key value in the APK or the web bundle; no phone numbers, addresses or coordinates in API/web logs or audit metadata | Verified |
| Google map, place search, reverse geocoding (web) and the rendered map (app) | Replaced by OpenStreetMap in SHP-006; web map, search and address suggestion verified in Chrome on 2026-11-06 |
| iOS build | **Not run** (requires macOS) |


### DS-001 (2026-11-04)

| Check | Result |
|---|---|
| `pnpm tokens:check` and `pnpm --filter design-tokens test` (15 tests: naming, contrast, validation failures, Dart line length, generated files up to date) | Passed |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | Passed |
| `pnpm test`: api 60, admin_web 76 (2 new `BrandMark` tests) | Passed |
| `pnpm --filter admin_web build`; built CSS contains the token width utilities; prerendered titles unchanged ("Platform sign-in · Admin portal", "Shops · Platform · Admin portal") | Passed |
| `fvm dart format` check (generated Dart is already formatted), `fvm flutter analyze` | Clean / no issues |
| `fvm flutter test`: flutter_shared 40 (2 new), customer_app 1, shop_app 19 | Passed |
| actionlint 1.7.12 on the updated `ci.yml` | 0 errors |
| API e2e, emulator walkthrough | Not re-run (no API or behaviour change; Shop App sign-in only gains the brand mark and the 448 px form width) |

### Earlier features (2026-11-03)

### SHP-002

| Check | Result |
|---|---|
| `fvm flutter analyze` | No issues |
| `fvm dart format` check (lib and test of the 3 Flutter packages) | Clean |
| `fvm flutter test`: shop_app 19, flutter_shared 38, customer_app 1 | Passed |
| `fvm flutter build apk --debug --dart-define-from-file=config/local.json` (shop_app) | Passed |
| APK scan: no Supabase secret key value (only the publishable key, by design) | Verified |
| Android emulator walkthrough against local Supabase + API: sign in, wrong code, shop list (tenant-scoped for two owners), shop home, restart keeps the session, sign out, unregistered number creates no account | Verified |
| No plaintext token in app storage (encrypted secure storage) | Verified |
| iOS build | **Not run** (requires macOS) |

### PLT-001

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test`: api 60, admin_web 74 | Passed |
| `pnpm --filter api test:e2e`: 60 tests, 12 of them new (registry pagination, detail, 404s, query validation, owner 403, 401) | Passed |
| `db:check-drift` and OpenAPI export | No difference; `/v1/platform/shops*` documented |
| HTTP walkthrough with real local Supabase sessions (11 checks: list, order, owner contact, detail, not-found, tampered cursor, owner gets no-access with no data, signed-out redirect) | Verified |
| Interactive browser walkthrough | **Not run** (skipped at the product owner's request) |

### SHP-001

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` | Passed |
| `pnpm test`: api 60, admin_web 67 | Passed |
| `pnpm --filter api test:e2e`: 48 tests. 14 are new: registration, multi-shop, phone required, validation, malformed JSON, member access, cross-tenant 404 both ways, platform admin 404, unknown and malformed ids, one-master and name constraints | Passed |
| `db:check-drift` and OpenAPI export | No difference; `/v1/shops` documented |
| Scripted HTTP walkthrough without JavaScript, against local Supabase and the API: OTP sign-up, wrong code, resend cooldown, register, cross-tenant URL, platform admin refused, sign-out | Verified. 17 checks passed directly; the 3 not-found checks were confirmed in the streamed payload |
| Logs contain no OTP codes, tokens or secrets | Verified |
| Interactive browser walkthrough | **Not run** (skipped at the product owner's request) |
| GitHub Actions for the branches | **Not run** (not pushed) |

### AUTH-001

| Check | Result |
|---|---|
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | Passed |
| `pnpm test`: api 55 unit tests, admin_web 25 component/unit tests | Passed |
| `pnpm build` (Nest, Next) | Passed |
| `pnpm --filter api test:e2e`: 34 tests on Postgres 17 covering token rejection cases, just-in-time user creation and concurrency, identity conflict, platform guard, provisioning, append-only audit, auth-unavailable 503 | Passed |
| `pnpm --filter api db:check-drift` on the migrated test DB | No difference |
| actionlint 1.7.12 on the updated `ci.yml` | 0 errors |
| Live API with real local Supabase ES256 tokens (`/v1/me` admin, phone user, no token) | Verified |
| Operator script: create, re-run (no change), weak password rejected | Verified |
| Web over HTTP without JavaScript: wrong password, correct sign-in (303 + HttpOnly cookie), console, non-admin rejection and `/platform/no-access`, sign-out, signed-out redirect | Verified |
| No secret or publishable key in the web client bundle; no tokens or passwords in API and web logs | Verified |
| Interactive browser walkthrough (Claude in Chrome) | **Not run** (skipped at the product owner's request) |
| Client-side rendering of the error boundary when the API is down | **Not visually verified** (server streams the error digest correctly) |
| Flutter checks | Not re-run (no Flutter changes in AUTH-001) |
| GitHub Actions for the AUTH-001 branch | **Not run** (not pushed) |

## 7. Next actions

1. **Web first, then mobile (product owner, 2026-11-07).** The web shop admin and platform admin UI pass is complete (WEB-001 to WEB-005, CAT-003 to CAT-006, DS-003, DS-004, SHP-006, PLT-003, PERF-001). The web and server are finished before the mobile apps:
   - **Step A (shop web, no new decisions):** ~~Shades as a table~~ (done, WEB-006); ~~side sheet for small forms~~ (done, WEB-007, D-051); ~~Shop settings~~ (done, SHP-008); ~~shop categories~~ (done, CAT-007, D-048); ~~Overview dashboard v1~~ (done, WEB-008). Step A is complete; next is Step B (ORD-001).
   - **Step B (Phase 2 ordering, server and shop web):** ~~ORD-001 orders API~~ (done, D-053, D-054; `orders:seed-test`); next ORD-002 shop Orders page (list table, order detail, step buttons, not-available and substitute sheets, payment and return), ORD-003 dashboard with order KPIs, then ORD-004 orders recorded by the shop for customers without the app (D-054).
   - **Then mobile:** Shop App (orders and products; SHP-007), then the Customer App on the same APIs.
   - Owner: domains, trademark check, bundle IDs (question 41).
2. **Next phase: plan the Customer App foundation** with the product owner: CUS-001 sign-up and profile (customer type, D-036), CUS-002 Find shops and My Shops (D-037, D-038), CUS-003 shop storefront. Ordering questions 30–32 answered (D-045 to D-047).
3. **Product owner checks:** try the platform **Reviews** decision form in Chrome as the platform admin; confirm the CAT-002 assumptions (price ≤ MRP, 10-product rule).
4. **Test hosting (INFRA-001):** owner completes the Supabase, Render, Vercel and GitHub-variable steps in `docs/guides/DEPLOYMENT.md`, then releases `dev` to `main`. Hardening before production: questions 46, 47, 49 and 51 (the test environment uses test phone numbers and email confirmations).
5. **Product owner:** real brand catalogue data; confirm the CAT-002 assumptions (price ≤ MRP, 10-product rule).
6. **Housekeeping.** Install Node 24 locally.
7. **Marketing (not a product feature):** daily Instagram content for **@zero.byt** via `/instagram post <day>` / `/instagram reel <day>` (skill `.claude/skills/instagram/`) and the 30-day calendar `marketing/instagram/CONTENT_PLAN_30_DAYS.md`. A format library of 10 poster formats (showcase, feature spotlight, how it works, poll, this or that, myth vs fact, tip, sneak peek, before/after, big-type teaser) in the approved families A (main), D and C. No format repeats on consecutive post days, and "Coming soon" appears only on Days 1, 7, 22, 28 and 30. English only, no product name, "Powered by zero.byt" lockup (36px logo). Days 1 (single poster), 2 (reel), 3, 5, 6 and 7 are `ready`. Tagline "Shop. Painter. Customer. Connected." (D-040); the SevenPalette name stays secret in posts until the Day 30 reveal (product owner, 2026-11-06). Reels: the owner reviews the script and one sample frame before the rest is built.

## 8. Feature progress

| Area | Status | Notes |
|---|---|---|
| Product requirements | Documented | Some business rules remain open |
| Architecture | Foundation + auth implemented | Hosting still proposed |
| Design system | Provisional tokens from one source (DS-001); component tokens and the project's own components on web and Flutter, guarded in CI (DS-002) | `packages/design_tokens` → web `tokens.css` + Flutter `flutter_shared`; DESIGN_SYSTEM §8 |
| Platform admin sign-in | **Complete (local)** | AUTH-001 |
| Shop onboarding | **Complete locally:** registration (SHP-001), Shop App sign-in (SHP-002), profile + map location + checklist (SHP-003), photo (SHP-004), products (CAT-002), review and approval (PLT-002) | Decision notifications later (question 53) |
| Customer authentication | Not started | Supabase phone OTP decided; SMS vendor open |
| Catalogue | Brand catalogue (CAT-001) and shop catalogue (CAT-002) on the web; everyday catalogue in the Shop App (SHP-005) | Customer requests for unavailable items with the Customer App (D-029); tinting open (question 52) |
| Cross-shop search | Not started | Price visibility open |
| Orders | Not started | Fulfilment lifecycle open |
| Painter sites | Not started | Core workflow |
| Bills/payments | Not started | GST and adjustment rules open |
| Shop credit | Not started | Shop-specific rules |
| Rewards | Not started | Earning/redemption rules open |
| Painter references | Not started | Visibility/dispute rules open |
| Online payment gateway | Deferred | Later phase |
| Subscription billing | Deferred | Later phase |

## 9. Confirmed constraints to preserve

- One shared Customer App and one shared Shop App.
- One responsive web portal with Shop Admin and Platform Super Admin areas.
- Painters can manage multiple sites; normal customers do not need sites.
- Search shows active-shop products first, then other shops separately.
- Customer switches to a product's shop before adding it to cart.
- Each cart/order belongs to one shop.
- Painters need combined site spending and separate shop bills.
- Normal customers need separate shop bills but no site management.
- Each shop decides its own credit approval.
- Shop references must not become automatic credit scoring.
- Shop onboarding requires photo, address, support mobile and at least 10 products before public discovery.
- Shops self-register on the web. The registering person becomes the protected master account, and one person may master several shops.
- A shop becomes visible to customers and painters only after the owner completes the checklist and submits it, and a platform admin approves it.
- Reward points and painter commission are separate concepts.
- Online gateway and subscription billing are deferred.
- Initial market Kerala; English; Android, iOS and responsive web.
- Supabase Auth: mobile OTP for customers and shop users, email + password for platform admins.

## 10. Change log

| Date | Change |
|---|---|
| 2026-11-03 | Initial product and engineering starter documentation created. |
| 2026-11-03 | M0 foundation scaffolded: pnpm + Dart pub workspaces, API/web/Flutter shells, shared design tokens, local Postgres, CI, ADR 0004. |
| 2026-11-03 | First commit pushed by the product owner; CI green on GitHub (Node 24). |
| 2026-11-03 | Phase 0 auth decisions recorded (D-021–D-023). AUTH-001 implemented: auth foundation, platform admin sign-in, ADR 0005 and ADR 0006. |
| 2026-11-03 | Shop model changed by the product owner (D-024–D-026; D-023 superseded). SHP-001 implemented: shop self-registration, shop sign-in on the web, tenant-scoped shop access. |
| 2026-11-03 | PLT-001 implemented: read-only platform shop registry. |
| 2026-11-03 | SHP-002 implemented: Shop App sign-in, shop list and home (Flutter), verified on the Android emulator. |
| 2026-11-04 | Product owner answered the onboarding, catalogue, pricing and review questions (D-027–D-034). DS-001 implemented: single-source design tokens and brand names. |
| 2026-11-04 | SHP-003 implemented: shop profile, address, map location and onboarding checklist (web + Shop App), verified in Chrome and on the Android emulator. |
| 2026-11-04 | SHP-004 implemented: shop photo with a portable S3-protocol storage port and metadata-stripping image pipeline (ADR 0007). |
| 2026-11-04 | CAT-001 implemented: platform brand catalogue with CSV import and read API (ADR 0008). |
| 2026-11-04 | CAT-002 implemented: shop catalogue with per-pack prices and availability, own products, favourite and own shades, products checklist item. |
| 2026-11-04 | PLT-002 implemented: shop review (submit, withdraw, approve, request changes with reasons, resubmit) with the D-033 edit lock. |
| 2026-11-04 | DS-002 implemented (D-039): component tokens, the project's own UI components on web and Flutter, `pnpm ui:check` in CI. |
| 2026-11-04 | Product owner answered the Customer App questions (D-036–D-038). SHP-005 implemented: the everyday catalogue in the Shop App. Phase 1 complete. |
| 2026-11-05 | Marketing tooling: `/instagram reel` / `/instagram post` skill (poster/reel-cover templates rendered to PNG with headless Chrome, hook, caption-lint and hashtag references) and a 30-day "coming soon" plan for the @zero.byt page under `marketing/instagram/`. No app code changed. |
| 2026-11-05 | Instagram redesign: the product owner rejected the first posters, reviewed 4 designed concepts and chose styles A, D and C (B rejected). English only, transparent zero.byt logo, tagline "Your shop, your painters, your customers. Connected." Templates, skill, 30-day plan (a style per day) and Day 1 updated. |
| 2026-11-05 | Instagram: format library (F1–F10) so the 30 days vary; calendar rewritten (10 reels, 20 post days, engagement CTAs, "Coming soon" only on 5 days); Day 1 is poster A alone; Days 3, 5, 6 and 7 generated. |
| 2026-11-05 | WEB-001 implemented: public home page with Login/Register; platform admin entry removed from it. |
| 2026-11-05 | Trial palette from the product owner's brand poster (deep teal, sunflower, coral, cream) applied to all tokens (web + Flutter) and the home-page hero; one commit so it can be reverted. |
| 2026-11-05 | Pill-shaped buttons everywhere (`component.button`). Home footer: company, legal and social placeholders and "Powered by zero.byt" (the platform is a product of zero.byt; `BRAND.companyName`). |
| 2026-11-05 | zero.byt transparent PNG logo in the home footer. Writing and capitalisation rules for the whole project (DESIGN_SYSTEM §9a); home copy aligned ("Sign in", "Shop Admin Portal", straight apostrophes). |
| 2026-11-05 | WEB-001 merged into `dev` after rebasing onto the marketing commits. Flutter 3.47.9 reinstalled through FVM; Flutter format, analyze and tests (flutter_shared 64, shop_app 70, customer_app 1) passed. Stale Turbopack dev cache (`apps/admin_web/.next/dev`) served an old `globals.css`; clearing it fixed the scroll effects in dev. |
| 2026-11-06 | WEB-002 implemented: separate Sign in (`/sign-in`) and Register (`/register`, 2 steps → `/shops/new`), shared auth layout, +91 field, self-submitting code, 60 s resend countdown; `Field` prefix, `Button` tertiary. |
| 2026-11-06 | WEB-002 gaps closed: platform admin sign-in in the shared auth layout, resend countdown restarts for every code (`sentAt`), full flow verified at phone width. |
| 2026-11-06 | DS-003: product named SevenPalette (D-040) with the shade-card fan logo; names in brand.json and native labels, logo files and generator, web and Flutter brand mark, favicon, launcher icons. |
| 2026-11-06 | WEB-003: Your shops screen in the premium style; `CardLink` `raised` and `dashed` variants. No API change. |
| 2026-11-06 | Instagram: Day 2 reel (script, cover, approved style frame, caption). Campaign tagline switched to the D-040 one; Days 1 and 7 re-rendered; product name kept secret until a Day 30 reveal; reel review gate added to the skill. |
| 2026-11-06 | WEB-004: shop console restyled; shared `AppShell`, `NavLinks`, `PageHeader`, `Field`, `StateMessage`, `PageLoading` gained options; new `SegmentedLinks`. Local sample catalogue loaded for checks. No API change. |
| 2026-11-06 | Instagram: Day 2 reel rendered as a fully animated MP4 (21 s, 1080×1920, H.264) with `scripts/reel-capture.mjs` (headless Chrome frames + ffmpeg, installed via winget). |
| 2026-11-06 | Instagram: Day 2 reel re-timed to an AI voice-over (en-IN Prabhat via edge-tts), now 27.5 s with AAC audio; skill reel step includes voice-over. |
| 2026-11-06 | SHP-006: product owner chose not to set up Google billing; maps moved to OpenStreetMap (D-041). Leaflet + Nominatim on the web, flutter_map in the apps; Google Maps packages, keys and native wiring removed; `docs/guides/MAPS.md` replaces the Google setup guide. |
| 2026-11-06 | DS-004: required fields show a red asterisk (web `aria-required`, Flutter spoken "required") with "Fields marked * are required." per form; shop profile note explains the fields are needed for review. |
| 2026-11-06 | CAT-003: shop catalogue is a filterable, paged table (new `pack-rows` API, `DataTable`/`ColumnFilter`/`Pagination`); status badges filled with soft colours (green Available, amber Not available); list, colour and rollout rules added to CLAUDE.md and the UI skill. |
| 2026-11-06 | Owner's admin-web guidance recorded: FEATURE_CATALOG §4 planned rows (navigation v2, business dashboard, guided first products, row action menu), ERP modules as a later phase, D-042, open questions 54–56. |
| 2026-11-06 | Instagram: finished media (PNG/MP4) now live only in the marketing folder `C:\Users\faiza\Downloads\New folder` (brand.json `mediaDir`), one `day-XX/` per day plus a generated README index; media removed from git and ignored; the repo keeps sources and captions. |
| 2026-11-06 | WEB-005: collapsible sidebar with shop switcher and account menu; ⋯ row menu (edit, availability, archive with confirmation) on the catalogue; new `Menu`, `ConfirmDialog`, `IconButton`. |
| 2026-11-06 | CAT-004: "Add from brand catalogue" became a quick-add form (a price means "sell this pack size"), with progress toward 10 products and a sticky "Add N products" bar. Local test shop "Sree Colours" (test number 3) created for checks. |
| 2026-11-06 | CAT-005 (D-043): one Add product flow with a cross-brand search; new products choose "Sold by" (unit group enforced by the API); Quick start kept for shops under 10 products. |
| 2026-11-07 | CAT-006: Products page shows one row per product (photo, chips, availability summary) with a filter toolbar; `product-rows` API replaces `pack-rows`; new `Thumbnail` and `PackChip`. |
| 2026-11-07 | PLT-003 Part 1: platform shops and review queue as tables (search by shop, owner or mobile; status tabs with counts; sort; pages; wait badge). Local-only test platform admin created for browser checks (password in gitignored .env.local). |
| 2026-11-07 | PLT-003 Part 2: platform brands and a brand's products as tables (status tabs, search, category, pages, photos, pack chips). |
| 2026-11-07 | PERF-001 (D-044): GET search and filters go through the client router (`UrlForm`), so they no longer reload the page; Shades page split into a static shell and per-section loading; new `data-loading` skill with web and Flutter rules, linked from CLAUDE.md, ui-implementation and code-review. |
| 2026-11-07 | Owner: web first, then mobile. Ordering decided: automatic acceptance with not-available notices and substitutes (D-045), pickup and delivery with shop delivery settings (D-046), cancel until ready or dispatched, partial fulfilment and returns at launch (D-047), shop categories (D-048). Roadmap Step A (shop web) and Step B (ordering) recorded. |
| 2026-11-07 | WEB-006: Shades page as three tabs with tables, search and numbered pages; shade list APIs switched from cursors to pages. |
| 2026-11-07 | Owner: delivery locations are accurate points, shop delivery area by km (D-049); credit needs a verified mobile and an ID document (D-050, question 57); small forms open in a side sheet (D-051). WEB-007 Part 1: `SideSheet` and `Toast`; Add product and Add shade open in sheets. |
| 2026-11-07 | WEB-007 Part 2: platform Add brand, categories table with add and edit sheets, brand shades as a paged table (API: page-based platform shade list), Add product for a brand in a sheet. |
| 2026-11-07 | SHP-008: Shop settings page (account menu): delivery on/off with flat charge, free-above amount and km distance (needs the map location), and editable order messages in side sheets; new `shops` columns with CHECK constraints; one toast at a time. Assumptions to confirm: pickup always on, limits ₹10,000 / 50 km / 10 messages. |
| 2026-11-07 | CAT-007: shop categories (D-048) in `catalogue_categories.shop_id` with partial unique indexes; shop Categories page (table, add/edit/archive in sheets); own products may use own categories; platform and public lists exclude them. Assumptions to confirm: 50 per shop, no name shared with a platform category. |
| 2026-11-08 | WEB-008: Overview dashboard v1 with `StatTile` KPI row (on sale, all/some/no sizes available) linking to filtered products, to-dos (setup checklist until Live), pickup and delivery and shades/categories cards; `catalogue/summary` API. Step A (shop web) complete. |
| 2026-11-08 | Owner: order steps, payment at pickup/delivery recorded by the shop, roles (D-053); shop-recorded customers, sites and orders private to the shop, shared only after the person connects with an OTP (D-054, ORD-004). ORD-001: `shop_customers`, `orders`, `order_items`, append-only `order_events`; shop orders API (list, detail, steps, not available, substitute, payment, return) with tenant e2e; `OrderPlacementService`; `orders:seed-test` script. |
| 2026-11-07 | Owner: free test hosting (D-052, ADR 0009). INFRA-001: `render.yaml` (Render Free API, deploys after CI on `main`, migrations at start), `apps/admin_web/vercel.json` (Vercel Hobby, `main` only), `keep-alive.yml`, `docs/guides/DEPLOYMENT.md`. |
| 2026-11-08 | INFRA-001 live: Supabase `sevenpalette-test` (Singapore, Data API off, test phone numbers), Render API, Vercel web, `API_BASE_URL` repository variable; keep-alive verified. |
