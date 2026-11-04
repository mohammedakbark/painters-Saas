# Feature: Shop App catalogue (everyday tasks)

- **Feature ID:** SHP-005
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-04
- **Related modules:** Shop App (`apps/shop_app`), `packages/flutter_shared` (rupees, `AppNetworkImage.rounded`); API unchanged (CAT-002 routes)
- **Decisions:** D-029 (availability per pack size), D-030 (brand catalogues), D-033 (products always editable), D-039 (shared components). D-036 to D-038 (Customer App decisions) were recorded in this feature's planning.

## 1. Problem and goal

Owners manage their catalogue on the web portal (CAT-002), but day-to-day changes happen at the counter: a pack runs out, a price changes, a new product arrives. The Shop App lets the owner do these everyday tasks on the phone.

**Scope (product owner, 2026-11-04, "everyday tasks"):**
- the product list;
- the availability switch, price and MRP;
- adding and removing pack sizes;
- archive and restore;
- adding a product from the brand catalogue;
- product photos from the camera or the gallery.

Own products and shades stay on the web.

## 2. User roles and permissions

| Role | Can |
|---|---|
| Master (owner) | Everything in §4 |
| Other members (none exist yet; staff roles come later, question 37) | Read the catalogue; no edit controls. The API refuses changes with 403 (`CATALOGUE_MANAGER_ROLES = ['MASTER']`) |
| Non-member | "Shop not found" (the API answers 404 for other shops) |

The app only hides controls. Every rule is enforced by the API: membership, role, and that each product or pack belongs to this shop.

## 3. Preconditions

- The user is signed in to the Shop App (SHP-002).
- The shop exists. Its status does not matter: products can always be edited (D-033).

## 4. User flows

1. **Shop home → Products.** The list shows Selling or Archived, with search by product or brand name. Each card shows the thumbnail, the name, "brand · category", and each pack as "4 L · ₹1,450", its MRP and an "Unavailable" badge. 25 products per page, with Load more.
2. **Product page:**
   - the photo (or "No photo yet") with **Take photo** and **Choose from gallery**;
   - the description;
   - one row per pack size: the price line, an **Available** switch, **Change price** and **Remove**;
   - **Add a pack size**;
   - **Archive product** or **Restore product**.
3. **Change price:** a bottom sheet with "Your price" (₹) and "MRP (optional)". Saving shows "Price saved."
4. **Add a pack size:**
   - Brand catalogue products choose from the catalogue pack sizes the shop doesn't sell yet.
   - Own products enter a quantity and a unit (L, ml, kg, g, pc).
   - Then price, MRP and availability.
5. **Remove a pack size:** asks first ("Stop selling 4 L?"). Remove is disabled on the last pack, with the explanation shown.
6. **Archive:** asks first. **Restore** does not ask.
7. **Add from brand catalogue:**
   - choose a brand (dropdown) and search by product name;
   - products the shop already sells show "In your products" and **Open**;
   - **Add** opens the pack screen: every pack size starts ticked, as on the web, and needs a price; MRP and availability per pack;
   - saving opens the new product.

**Failure paths:**
- Invalid amounts, a price above the MRP, or a missing quantity: the message shows on the field.
- API field errors (`errors[].path`): shown on the matching field.
- 409 (`last_pack`, `pack_exists`, `pack_limit`, `product_already_listed`): the API's sentence. "Already listed" also offers **Go to your products**.
- 403: "Only the shop owner can change the catalogue."
- 413: "The photo is too large. Choose one under 5 MB." 503: "Photos can't be saved right now."
- No connection: "We couldn't reach the server…".
- Load failures: an error view with **Try again**. A failed "Load more" shows an inline message with Try again.

## 5. Business rules

1. Money is entered in rupees and sent as integer paise; it is shown with Indian grouping (`formatRupees`, shared with the web rules). At most 2 decimals, more than ₹0, up to ₹1 crore.
2. The price may not be above the MRP (CAT-002 assumption, still to confirm). An empty MRP clears it (explicit `"mrpPaise": null`).
3. Availability changes show only the saved state from the API; there is no optimistic switch. A failed change keeps the saved state and says why.
4. Pack quantity: more than 0, at most 1,000,000, at most 3 decimals (the API's rules).
5. After any change, the product lists and the review checklist reload, so the onboarding "Products" item stays correct.

## 6. UI requirements

- **Components:** only the D-039 components: `AppButton`, `AppTextField` (₹ prefix), `AppSearchField`, `AppDropdown`, `AppSegmentedControl`, `AppSwitchRow`, `AppCheckboxRow`, `AppRadioGroup`, `AppCard`, `AppSection`, `AppNavRow`, `AppBadge`, `AppInlineMessage`, `showAppBottomSheet`, `showAppConfirmDialog`, `showAppSnackBar`, `AppNetworkImage` (new `rounded` option for thumbnails).
- **Accessibility:** prices use tabular figures. Each availability switch has a spoken label ("4 L available"). Status is always in words ("Unavailable", "Archived").
- **Sheets:** they move above the keyboard (verified on the emulator).
- **Photos:** the app resizes to at most 2400 px and saves as JPEG (quality 85) before uploading, which also converts iPhone HEIC photos. The API checks the format again and removes all metadata (SHP-004).

## 7. API contract

No API change. The app uses:
- **Shop catalogue:** `/v1/shops/:shopId/catalogue/products` (list, add), `…/products/:id` (get, PATCH status), `…/packs` (POST), `…/packs/:packId` (PATCH, DELETE), `…/image` (PUT multipart `image`), `…/brand-products`;
- **Brand catalogue:** `/v1/catalogue/brands` (followed 50 per page, at most 10 pages) and `/v1/catalogue/products/:id`.

## 8. Data model and migrations

None.

## 9. Security and privacy

- **Tenant safety:** unchanged and enforced by the API (CAT-002 e2e tests cover every route with two shops).
- **Error mapping:** `shop_not_found` → "Shop not found"; `shop_product_not_found`/`shop_pack_not_found` → "Product not found"; 403 → the owner-only message.
- **What the app keeps of errors:** only the problem `code`, `detail` and field messages. It never logs request or response bodies, tokens or photo bytes.
- **Photos:** `requestFullMetadata: false`, and the API removes all metadata anyway.
- **No secret** in the APK (checked against the local secret values).

## 10. Acceptance criteria

- [x] The shop home has a **Products** card; the status text no longer says products "will appear".
- [x] The list: Selling/Archived, search, pack prices with MRP and availability, Load more; loading, empty, no-match and error-with-retry states.
- [x] The product page shows the photo (brand catalogue photos labelled), the details and the packs, and warns when the platform removed the catalogue product.
- [x] The availability switch saves and shows the saved state; a failure keeps it and explains.
- [x] The price sheet: rupee parsing, price ≤ MRP, API field errors on the field, clearing the MRP.
- [x] Pack sizes are added (catalogue or own) and removed (with confirmation; never the last one).
- [x] Archive asks first; restore doesn't; the lists refresh.
- [x] Add from brand catalogue: brand and search, already-sold products open, packs pre-ticked with prices, the new product opens, "already listed" explained.
- [x] Photos from the camera and the gallery upload and show; 400/413/503 explained; cancelling does nothing.
- [x] Non-owners see no edit controls; 403 explained; wrong shop/product → not found.
- [x] The review checklist reloads after changes.

## 11. Test plan

- **flutter_shared** (`rupees_test.dart`, 3): the web portal's money cases.
- **Shop App unit tests** (`catalogue_unit_test.dart`, 13):
  - JSON parsing (catalogue and own products) and `apiExceptionFrom` (code, detail, field errors, no body in `toString`);
  - request bodies: `PackChange` and `NewPack`;
  - repository requests through a fake Dio adapter: list query, PATCH with an explicit null MRP, catalogue listing body, the multipart field `image`;
  - error mapping (404 shop/product, 403, 409);
  - image signatures, price reading and quantity rules.
- **Shop App widget tests** (`catalogue_test.dart`, 23):
  - the list: prices and badges, tabs and search, Load more, empty, retry, shop not found;
  - the product page: availability saved and failed, non-owner read-only, price validation, clearing the MRP, API field error, last pack, remove with confirmation, adding catalogue and own packs, archive/restore, photo upload and cancel, 413, 403;
  - add from catalogue: empty brands, listing a product, already listed.
- **Existing tests stay green:** `app_test.dart` and `shop_profile_test.dart`.

## 12. Dependencies and open questions

- **Staff roles** (question 37): until they exist, only the master changes the catalogue.
- **Not in the app:** own products and shades (web only, by choice), and customer product requests for unavailable items (D-029, with the Customer App).
- **To confirm:** the CAT-002 assumptions (price ≤ MRP; the 10-product rule).

## 13. Implementation notes

**Added files:**
- `lib/src/api/api_client.dart`: query parameters, POST/PATCH/DELETE, multipart; `ApiException.detail` and `fieldErrors`.
- `lib/src/catalogue/`:
  - `catalogue_models.dart`;
  - `shop_catalogue_repository.dart` (typed errors; `PackChange` is tri-state for the MRP);
  - `product_photo_picker.dart` (`image_picker` 1.2.4, pinned; published 2026-10-06);
  - `catalogue_providers.dart` (`PagedController`, `ProductController.apply`, `catalogueChanged`).
- `lib/src/features/catalogue/`:
  - `product_list_screen.dart`, `product_screen.dart`;
  - `pack_sheets.dart` (`readPackPrice`, `PackPriceFields`);
  - `add_from_catalogue_screen.dart`, `catalogue_listing_screen.dart`;
  - `catalogue_parts.dart`, `catalogue_messages.dart`.

**Changed:**
- Routes under `/shops/:shopId/catalogue`; the home Products card; `main.dart` wiring.
- iOS `Info.plist`: camera and photo-library descriptions.
- `flutter_shared`: `money/rupees.dart` and `AppNetworkImage.rounded`.

**Found on the emulator and fixed:**
- the large "No photo yet" placeholder showed a card inside the card; it is now a plain grey fill;
- the archived notice repeated "Archived" after its title;
- the add screen's title was cut off; it is now "Brand catalogue".

**Verified locally (2026-11-04):** see `docs/PROJECT_STATE.md` §6 (SHP-005).

**Not verified:**
- the no-connection state on the emulator (removing the port forward didn't cut the open connection); it is covered by widget tests;
- iOS (no Mac).

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-04 | Specification and implementation (product owner's choice of "everyday tasks") |
