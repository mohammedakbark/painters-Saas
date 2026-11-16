# SHP-013: Shop profile, review and settings in the Shop App

Status: **Complete (local; tests)**; emulator not run (`docs/PROJECT_STATE.md` §6). Fourth of the Shop App redesign features (owner, 2026-11-15).

## Goal

A shop owner can finish and run the shop from the phone: change the profile and photo, submit the shop for review and set delivery and order messages, on the existing APIs (SHP-003, SHP-004, SHP-008, PLT-002). No API or database change.

## Owner choices (2026-11-16)

- **Submit for review and Withdraw are in the app**, not only on the web.
- **The map location stays "Use my current location"** in the app (standing at the shop). Moving the pin by hand stays on the web.

## Shop profile (`shop.profile`)

- **Photo:** **Take photo** or **Choose from gallery** (the product photo picker; the API re-encodes to WebP). "Shop photo saved".
- **Address:** **Add address** / **Edit address** opens a bottom sheet: shop number, building and street; area or locality; landmark; city or town; district; state (dropdown, Kerala first chosen); PIN code. Required fields and the PIN code are checked first; the API's field errors (`address.*`) show under the fields. Saving keeps the support mobile and the location.
- **Support mobile:** **Add** / **Edit support mobile** sheet; a 10-digit Indian mobile. Saving keeps the address.
- **While the shop waits for review** everything is shown but locked: "Your shop is waiting for review, so its profile, photo and location are locked. To change them, withdraw the submission on the shop home." The API refuses changes too (`shop_in_review`).
- People without `shop.profile` see the profile read-only ("Not added yet." for empty items).
- After a save the profile and the home checklist read again.

## Review on the home (`shop.profile`)

- Draft or changes requested, checklist complete: **Submit for review** → "Shop submitted for review. We will let you know the decision." The status becomes In review.
- Checklist not complete: "Still to do before review: …" and **Open shop profile**.
- Changes requested: the reasons and note as before, then "Fix these, then submit your shop again." (with what is still to do).
- In review: **Withdraw submission**, after a confirmation, → back to Draft (or Changes requested).
- A refusal is explained (`onboarding_incomplete`: "The checklist is not complete yet…"). Staff without `shop.profile` only see the status.

## Shop settings (`shop.settings`)

- **Shop settings** in the side menu (only with `shop.settings`), route `/shops/:shopId/settings`; a link without it shows "You don't have access to this".
- **Pickup:** always offered.
- **Delivery:** On or Off badge with a summary ("₹40 per order · free from ₹2,500 · up to 8 km", "Free delivery · up to 5 km"). **Edit delivery** sheet: **Deliver orders** switch, delivery charge (₹, 0 is free), free delivery from (₹, optional), distance (1 to 50 km). Turning delivery on needs a charge and a distance; turning it off keeps the values. Without a map location the section says so with **Open Shop profile**, and the API's `delivery_needs_location` is explained.
- **Order messages:** the list with **Edit** and **Remove** on each, **Add message** (2 to 160 characters, different from the others, at most 10). Every change saves the whole list.

## Code

- `shops/shop_profile.dart`: `ShopAddress.stateCode` and `toJson`; `saveDetails`, `replacePhoto`, `submitForReview`, `withdrawReview`.
- `shops/shop_settings.dart`: `ShopSettings`, `DeliveryOptions`, `ShopSettingsRepository` (`shopSettingsRepositoryProvider`, `shopSettingsProvider`).
- `shops/indian_states.dart`: the API's state codes; a test checks them against `packages/api_contracts/openapi.json`.
- `features/shops/profile_sheets.dart` (`SupportPhoneForm`, `AddressForm`), `shop_profile_screen.dart`, `shop_settings_screen.dart` (`DeliveryForm`, `OrderMessageForm`), `review_messages.dart`, the review part of `shop_home_screen.dart`.
- Side menu row and route in `shop_shell.dart` and `routing/router.dart`.

## Tests

- `test/profile_edit_test.dart` (12): support mobile, address with checks and API field errors, photo from the camera, cancelled picker, the review lock, read-only without permission, submit and withdraw (with cancel), incomplete checklist, refused submission, staff without permission, the state list against the contract.
- `test/settings_test.dart` (7): delivery on with checks, free delivery at ₹0, off keeps the values, no map location, add/edit/remove messages with the duplicate check, the 10-message limit, menu row by permission.
- The full Shop App suite passes (168).

## Limits

- Moving the map pin by hand stays on the web (owner, 2026-11-16).
- The shop name can't be changed (as on the web).
