# CAT-007: Shop categories

Status: **Complete (local; Chrome)**. Step A3 of the "Web first" roadmap. Implements D-048.

## Goal
A shop can add its own product categories next to the platform's, for things the platform categories don't cover. Only that shop sees or uses them.

## Behaviour (web: `/shops/{id}/categories`, sidebar "Categories")
- **Table:** category, type (**Platform** or **Yours**), how many of the shop's products use it, status and Edit. Tabs: All, Yours, Platform, each with a count.
- **Add category** opens a side sheet (D-051). A name has 2 to 60 characters and can't repeat a platform category or one of the shop's own (case does not matter).
- **Edit** (own categories only) opens a sheet to rename, **Archive** or **Restore**. An archived category is hidden when adding products, and products keep it.
- **Add product** and the product edit page offer the active platform categories and the shop's own. An edit also keeps the product's current category if it was archived, marked "(archived)".
- Platform categories can't be changed by a shop.
- A shop has at most 50 categories of its own, so the list is not paged.

## Data and API
- **Data:** `catalogue_categories.shop_id`. Null means a platform category; set means one shop's own. The foreign key is `ON DELETE RESTRICT`, so a shop category never turns into a platform one.
- **Name uniqueness:** partial unique indexes keep names unique among platform categories, and separately within each shop. The API also stops a shop repeating a platform name.
- **Shop endpoints:**
  - `GET /v1/shops/:shopId/catalogue/categories` returns active platform categories and all own ones, with `own` and `productCount`;
  - `POST` adds a category (409 `category_name_taken` or `shop_category_limit`);
  - `PATCH /:categoryId` takes `name` and/or `active`, and only works on the shop's own categories (otherwise 404).
- **Platform endpoints:** `/v1/platform/catalogue/categories`, the public `/v1/catalogue/categories` and the CSV import only see platform categories.
- **Products:** an own product may use an active platform category or one of the shop's own. Another shop's category is refused with `category_unavailable`.
- **Audit:** `shop_catalogue.category_created` and `shop_catalogue.category_updated`, the latter with the changed field names.

## Assumptions (to confirm with the product owner)
- At most 50 own categories per shop.
- A shop category can't share a name with a platform category.
- Own categories are listed after the platform's.

## Tests
- API e2e (`shop-catalogue.e2e-spec.ts`):
  - listing;
  - duplicate names (platform and own), while another shop may reuse the name;
  - the platform and public lists exclude shop categories;
  - the platform can't edit a shop category, and a shop can't edit a platform one;
  - another shop gets 404 or `category_unavailable`;
  - archive blocks new products;
  - the audit trail.
- Web unit test `lib/api/shop-categories.test.ts`.
- Chrome at 1280 px and 518 px:
  - a duplicate of a platform name is refused;
  - add, rename and archive through sheets, with toasts and no reload;
  - the new category appears in the Add product select;
  - no console errors.
