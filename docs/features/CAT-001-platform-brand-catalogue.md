# Feature: Platform brand catalogue

- **Feature ID:** CAT-001
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-04
- **Related modules:** API (`src/catalogue/`), web portal (`/platform/catalogue/**`), seed script
- **Decisions:** D-030 (brand catalogues maintained by the platform, filled by hand or CSV, never scraped), D-029 (availability per pack, for CAT-002), ADR 0007 (images), ADR 0008 (catalogue model)

## 1. Problem and goal

Shops sell products of a few paint brands, each with its own product lines, pack sizes and shade card. Platform admins keep these brand catalogues once for every shop. Shops then pick products from them (CAT-002) instead of typing everything, and customers later choose shades by code and name.

## 2. User roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Platform admin | Create, rename, archive and restore categories, brands, products (with pack sizes and an image) and shades; import shades and products from CSV | — |
| Any signed-in user (shop owners now, customers later) | Read active categories, brands, products and shades (`/v1/catalogue`) | Change anything (403 `platform_admin_required` on management routes) |
| Not signed in | Nothing (401) | — |

## 3. Preconditions

A platform admin account (AUTH-001). For local development, `pnpm --filter api catalogue:seed-sample` loads a clearly fictional sample brand.

## 4. User flow (platform console, **Catalogue**)

1. **Catalogue:** brands with their product and shade counts, a search box and **Add brand**. A **Manage categories** link opens the categories page.
2. **Categories:** add a category (with an optional sort order); rename, reorder, archive or restore it.
3. **Brand → Products:**
   - search and filter by category;
   - **Add product**: name, category, pack sizes typed as "1 L; 4 L; 10 L; 20 L", description, and "Customers choose a shade".
4. **Product:**
   - edit the fields and pack sizes;
   - upload a product image (metadata stripped);
   - archive or restore.
5. **Brand → Shades:**
   - add a shade (code, name, optional screen colour);
   - search by code or name;
   - archive or restore.
6. **Brand → Import CSV:**
   - choose shades or products and the file;
   - **Check file** lists the counts or the row problems;
   - **Import** is enabled only after a clean check.
   - Templates can be downloaded.
7. **Brand settings:** rename, archive or restore the brand.

Failure paths:
- duplicate names or codes (case-insensitive) give 409 with the clash named;
- an archived category can't take new products;
- invalid pack sizes, colours and codes give a field error;
- an unknown brand or product shows the not-found page;
- an import with any row error saves nothing and lists the problems (at most 100);
- an invalid CSV or header is reported without echoing the file's content.

## 5. Business rules

1. **Names:** stored trimmed with single spaces. Unique per scope regardless of case:
   - categories and brands: globally;
   - products: per brand;
   - shade codes: per brand, stored upper case (letters, digits, space, `. / -`, at most 20 characters).
2. **Pack sizes:**
   - 1–12 per product; positive, at most 3 decimals;
   - units L, ml, kg, g, pc;
   - duplicates are ignored.
   - Removing a pack size that shops have listed is refused (409 `pack_in_use`, enforced by the foreign key from shop packs since CAT-002).
3. **No prices:** the brand catalogue holds none; MRP and selling price belong to each shop's listing (ADR 0008).
4. **Archiving, not deleting:** archived entries are hidden from the read API; a product in an archived category is hidden too.
5. **Shade colours** are indicative screen colours (`#RRGGBB`). The code and name are always shown as text.
6. **CSV import:**
   - all-or-nothing, with a dry run (the default);
   - limits: 2 MB and 5,000 rows; header required; unknown columns are refused;
   - matching: shade code or product name (case-insensitive); existing rows are updated, new rows created;
   - product pack sizes are only added, never removed;
   - categories are matched by name and must be active.
7. **Data source (D-030):** official shade cards and price lists only, never scraped from brand sites. The import page says so.
8. **Audit:**
   - each create and update records the names of the changed fields;
   - image uploads record size and replacement;
   - imports record the counts.

## 6. UI requirements

- Every console page reads its data inside its own `<Suspense>` (`PageLoading`), so navigation is instant. This now includes the existing platform overview and shops pages.
- Lists use cards with Active/Archived badges (in words).
- Empty, loading, not-found and error states.
- Forms show field errors and keep the typed values. The product and import forms submit in a transition, so the select values and the chosen file survive.
- Shades show a swatch with the code and name in text, plus the note "Colours on screen are indicative only".
- New components:
  - UI: `TextareaField`, `CheckboxField`;
  - catalogue: `FormStatus`, `BrandCreateForm`, `BrandSettingsForm`, `CategoryCreateForm`, `CategoryRowForm`, `ProductForm`, `ShadeCreateForm`, `ActiveToggleForm`, `ImportForm`, `ShadeSwatch`;
  - `ImageUploadForm`, generalised from the SHP-004 shop photo form.
- `NavLinks` takes a `label` (the brand tabs are "Brand sections"). The platform navigation gains **Catalogue**.

## 7. API contract

**Management** (`/v1/platform/catalogue`, platform admins):
- `GET`/`POST categories`; `PATCH categories/:id`;
- `GET`/`POST brands`; `GET`/`PATCH brands/:id`;
- `GET`/`POST brands/:brandId/products`; `GET`/`PATCH products/:id` (`packs` replaces the pack sizes); `PUT products/:id/image` (multipart `image`);
- `GET`/`POST brands/:brandId/shades`; `PATCH shades/:id`;
- `POST brands/:brandId/imports/{shades|products}?dryRun=true|false` (multipart `file`) returns a `CatalogueImportResult`: `applied`, `rows`, `created`, `updated`, `unchanged`, `errors[{row, message}]`, `errorCount`.

**Read** (`/v1/catalogue`, any signed-in user, active entries only):
- `GET categories`;
- `GET brands`; `GET brands/:id`;
- `GET brands/:id/products?q&categoryId&cursor&limit`;
- `GET brands/:id/shades?q&cursor&limit`;
- `GET products/:id`.

**Lists:** sorted by name, or by code for shades. Cursor pagination with an opaque `nextCursor`; a tampered cursor gives 400 `invalid_cursor`.

**Errors:** `validation_failed`, `*_exists` (409), `*_not_found` (404), `category_archived` (409), `pack_in_use` (409), `image_*`, `import_file_required`, `import_too_large` (413).

## 8. Data model and migrations

- **`20261104081545_cat_001_brand_catalogue`:** tables `catalogue_categories`, `brands`, `catalogue_products`, `catalogue_packs`, `shades`, and the enum `pack_unit`.
- **`20261104081630_cat_001_catalogue_checks`:**
  - trimmed names within length limits, with `name_key = lower(name)`;
  - the shade code pattern and `#RRGGBB` colours;
  - positive pack quantities;
  - image keys tied to their product;
  - `(brand_id, name)` indexes (also declared in `schema.prisma`);
  - RLS enabled.
- **Uniqueness:** `name_key` (categories, brands), `(brand_id, name_key)` (products), `(brand_id, code)` (shades), `(product_id, quantity, unit)` (packs).
- **Foreign keys:** `Restrict`, so rows are archived, never deleted.

## 9. Security and privacy

- **Writes:** management routes are platform-admin only (class-level `@PlatformAdminOnly`). Shop owners get 403 and unauthenticated callers 401 on every route (e2e).
- **Read API:** shared, non-tenant data only; no shop data.
- **CSV import:**
  - parsed in memory with `csv-parse`, with size and row limits;
  - error messages give row numbers and never echo unparseable content (tested).
- **Product images:** go through the ADR 0007 pipeline (metadata removed).
- **Audit metadata:** field names and counts only.
- **Every web Server Action re-checks `requirePlatformAdmin()`;** the API authorises every call.

## 10. Acceptance criteria

- [x] A platform admin can create, rename, archive and restore categories, brands, products (with pack sizes and an image) and shades in the console.
- [x] Duplicate names or codes are refused regardless of case, with a clear message.
- [x] Shade codes are stored upper case; colours are normalised to `#RRGGBB`.
- [x] Pack sizes typed as "1 L; 4 L" are parsed; invalid ones give a field error. Editing replaces the pack sizes and keeps the existing ones.
- [x] A CSV dry run reports counts or row problems without saving; an import applies all rows or none; a re-import updates.
- [x] Shop owners and other non-admins can read only active entries and cannot change anything (403); unauthenticated callers get 401.
- [x] Console navigation shows no Next.js instant-navigation warnings (platform pages included).

## 11. Test plan

- **API unit (27 new):** normalisation, colours, pack parsing, formatting and keys, cursors, page splitting.
- **API e2e (14 new):**
  - creation with normalisation and audit;
  - case-insensitive duplicates;
  - product validation and archived categories;
  - pack replacement and audit field names;
  - pagination, search and an invalid cursor;
  - shades;
  - product image;
  - 403/401 on management routes;
  - the read API shows only active entries;
  - CSV: dry run then apply then re-import; row errors roll back; header and invalid-CSV messages; product import with categories by name and pack additions.
- **Web (9 new):** pack text parsing and formatting, field-error mapping, the brand form, the product form (categories, errors and values kept), the import form (Import only after a clean check, problem list), `countLabel`.
- **Manual:** Chrome; see §13.

## 12. Dependencies and open questions

- **Real brand data:** from official shade cards and price lists (platform admins); asking brands for data permission is a later step (D-030).
- **Tinting workflow** (question 52): products only record "customers choose a shade".
- **Next feature:** CAT-002, the shop catalogue, uses the read API and adds `pack_in_use` enforcement.

## 13. Implementation notes

**API:**
- `src/catalogue/`:
  - `catalogue-text.ts` (normalisation and pack sizes), `catalogue.schemas.ts`, `catalogue-mapping.ts`;
  - services `catalogue-admin.service.ts`, `catalogue-import.service.ts`, `catalogue-read.service.ts`;
  - controllers `platform-catalogue.controller.ts`, `catalogue.controller.ts`.
- `src/common/pagination/keyset-cursor.ts`.
- `src/media/image-store.ts` + `MediaModule`: image upload logic shared with shop photos; `shop-photo.ts` removed.
- `csv-parse` 7.0.3.
- Seed script `src/scripts/seed-sample-catalogue.ts` (`catalogue:seed-sample`): 7 categories, "Demo Paints (sample)", 12 products, 24 shades. Idempotent; refuses production.

**Web:**
- `src/app/platform/(console)/catalogue/**` (pages, `actions.ts`, `catalogue-parts.tsx`, not-found);
- `src/lib/api/platform-catalogue.ts`;
- `src/lib/catalogue/` (`packs`, `form-state`) and `src/lib/media/image-file.ts`;
- `src/components/catalogue/*` and `src/components/media/image-upload-form.tsx`;
- `public/templates/catalogue-{shades,products}.csv`;
- `countLabel` in `src/lib/format.ts`.

**Found and fixed in Chrome:**
1. The shade form's "Shade name" label pointed at the brand settings input on the same page (duplicate `field-name` ids). The brand field is now `brandName`.
2. The upload and import forms set `encType` on function-action forms, and React warned; removed.
3. "Choose a image" / "Choose a image to upload": articles fixed on the web and in the API.
4. "1 active products": plurals fixed.

**Verified locally (2026-11-04):**
- **Chrome** (this computer, platform admin):
  - brands list with the seeded sample;
  - duplicate brand refused;
  - brand created;
  - product: invalid pack error with values kept, then created; image uploaded; packs changed (500 ml added, 1 L removed in the database);
  - shade added with a lower-case code (stored QA-100);
  - CSV: bad file gives 2 row problems with Import disabled; good file gives "ready" then "Imported: 3 new";
  - template downloads (200 `text/csv`);
  - console navigation (Overview, Shops, shop, Catalogue) without instant-navigation warnings.
- **Seed script:** 43 rows, then "already present" on a second run.

The full check list is in `docs/PROJECT_STATE.md` §6.

**Not verified:** shop-side use of the read API in a UI (that is CAT-002).

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-04 | Specification and implementation (D-030, ADR 0008) |
| 2026-11-04 | Fix (found in CAT-002): a shade search kept its filter only on the first page; the search and the cursor are now combined with AND (test added). `pack_in_use` now enforced by shop listings. |
