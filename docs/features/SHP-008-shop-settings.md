# SHP-008: Shop settings (pickup, delivery, order messages)

Status: **Complete (local; Chrome)**. Step A2 of the "Web first" roadmap.

## Goal
One settings page where the owner sets how customers get their orders (D-046, D-049) and the ready-made messages for items the shop can't supply (D-045). Orders (ORD-001) read these settings.

## Behaviour (web: `/shops/{id}/settings`, account menu "Shop settings")
- **Shop details and photo:** a link to the existing profile page (photo, support mobile, address, map location).
- **Pickup and delivery:** pickup at the shop is always offered. **Deliver orders** on or off, with:
  - a **delivery charge** (₹, flat per order; 0 means free);
  - an optional **free delivery from** amount (₹);
  - a **delivery distance** (whole km from the shop's map location, 1 to 50).
- **Delivery rules:**
  - Turning delivery on needs a charge, a distance and the shop's map location. Without a location the page says so and links to the profile.
  - Turning delivery off keeps the values for next time.
- **Order messages:** the list starts with "Stock not available." and "Stock can be arranged by tomorrow morning." Add and Edit open side sheets (D-051), Remove is on each row. Up to 10 messages, each 2 to 160 characters and different from the others.
- Staff (when they exist) see the settings read-only; only the owner (MASTER) changes them.

## API
- `GET /v1/shops/:shopId/settings` returns `pickup` (always true), `delivery` `{enabled, chargePaise, freeAbovePaise, radiusKm}`, `hasLocation`, `orderMessages` and `updatedAt`.
- `PUT /v1/shops/:shopId/settings/delivery` replaces the delivery settings. It returns 409 `delivery_needs_location` when delivery is turned on without a map location, and 400 for missing or out-of-range values.
- `PUT /v1/shops/:shopId/settings/order-messages` with `{messages}` replaces the list.
- The shop comes from verified membership. Other shops get 404. Changes are audited (`shop.delivery_updated` with `enabled`, `shop.order_messages_updated` with the count), never with values.

## Data
- New columns on `shops`: `delivery_enabled`, `delivery_charge_paise`, `free_delivery_above_paise`, `delivery_radius_km`, `order_messages` (text array with the two defaults) and `settings_updated_at`.
- CHECK constraints (`*_settings_checks` migration):
  - the charge is ₹0 to ₹10,000;
  - the free-delivery amount is ₹1 to ₹1 crore;
  - the distance is 1 to 50 km;
  - delivery on needs a charge, a distance and a latitude;
  - at most 10 messages.

## Assumptions (to confirm with the product owner)
- Pickup can't be switched off.
- The limits above: ₹10,000 maximum charge, 50 km maximum distance, 10 messages.
- Settings stay editable while the shop is in review (they are not part of the review).

## Tests
- API e2e `shop-settings.e2e-spec.ts`:
  - the defaults;
  - the location rule (409);
  - validation;
  - free delivery and turning delivery off keep the values;
  - messages are trimmed and unique, with at most 10;
  - audit events;
  - another shop's owner gets 404 and nothing changes.
- Web unit tests: `lib/shops/settings.test.ts` (rupees and km parsing) and `toast.test.tsx` (one toast at a time).
- Chrome at 1280 px and 518 px:
  - a shop without a location shows the location notice and the 409 message;
  - ABC PAINTS saved delivery (₹40, free from ₹2,500, 8 km);
  - a message was added, edited and removed through sheets, without a page reload;
  - no console errors.
