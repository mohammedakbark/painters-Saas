# SHP-014: Shades and categories in the Shop App

Status: **Complete (local; tests, Android emulator 2026-11-16)**; see `docs/PROJECT_STATE.md` §6. Last of the Shop App redesign features (owner, 2026-11-15).

## Goal

Bring the web Shades (WEB-006) and Categories (CAT-007) pages to the Shop App in mobile form, on the same APIs. No API or database change.

## Where

- Side menu, section **Catalogue** (only with `catalogue.view`): **Shades** and **Categories**. They open above the tabs (`/shops/:shopId/shades`, `/shops/:shopId/categories`); a link without `catalogue.view` shows "You don't have access to this".
- Changes need `catalogue.manage`; others see the lists read-only (D-056). The API checks both.

## Shades

- Chips **Favourites** (first), **Brand shades**, **My shades**; a search (code or name, on search); pages of 25 with **Load more**.
- Each row: the screen colour (`AppColorSwatch`; "no colour" shows a crossed-out mark, never white), code, name and brand, and a **Favourite** badge.
- Note under the search: "Screen colours are only a guide. Check the shade card before mixing."
- **Favourites:** **Remove favourite** takes the row away.
- **Brand shades:** a **Brand** dropdown (the first brand chosen), **Add to favourites** / **Remove favourite** on each row; only that row's button waits.
- **My shades:** **Add shade** at the bottom opens a sheet: shade code (up to 20 letters, digits, spaces, dots, slashes or dashes; stored in capitals), name, optional screen colour (`#E8D5B7`, with a live swatch) and optional brand. A code the shop already has shows the API's message on the field (`shop_shade_exists`). **Remove** asks first.
- Empty states: no favourites yet, no shades for the brand, no shades of your own, no match (**Clear search**), no brands.

## Categories

- Chips **All**, **Yours**, **Platform** with counts. Cards: name, product count, **Yours** or **Platform** badge, **Archived** badge.
- **Add category** at the bottom (`catalogue.manage`, up to 50 own): a name of 2 to 60 characters; a name already used by the platform or the shop shows the API's message (`category_name_taken`).
- Tapping an own category opens **Edit category**: **Save name**, **Archive category** or **Restore category** ("An archived category is hidden when adding products. Products keep it."). Platform categories can't be changed.

## Shared component (D-039)

- `AppColorSwatch` and `parseHexColour` in `packages/flutter_shared/lib/src/components/app_swatch.dart`, with the new component token `swatch` (radius, border, background) in `packages/design_tokens/tokens.json`.

## Code

- `catalogue/shades_repository.dart` (`ShadeItem`, `ShadePage`, `ShadesRepository`) and `catalogue/categories_repository.dart` (`ShopCategory`, `CategoriesRepository`), with `shadesRepositoryProvider` and `categoriesRepositoryProvider`.
- `features/catalogue/shades_screen.dart` (`ShadeListController`, `OwnShadeForm`) and `categories_screen.dart` (`CategoryForm`).
- `ApiClient.delete` for endpoints that answer 204 No Content (`deleteJson` expects a body).
- Side menu and routes in `shop_shell.dart` and `routing/router.dart`.

## Tests

- `test/shades_categories_test.dart` (10): favourite on and off, search and load more, add and remove an own shade with checks, duplicate code, retry, read-only shades, category list and chips, add/rename/archive/restore with checks and the duplicate name, read-only categories, menu without `catalogue.view`.
- `packages/flutter_shared/test/swatch_test.dart` (3): colour parsing and the no-colour mark.
- Full suites: Shop App 178, flutter_shared 75.

## Limits

- Editing an own shade (the API's `PATCH`) is not offered, as on the web: remove and add it again.
- Own products stay on the web.
