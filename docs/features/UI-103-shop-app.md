# UI-103: Shop App in the new design

**Status:** Complete (local; Flutter tests, Android emulator 2026-11-20)
**Decision:** D-060 · **Design:** claude.ai artifact `VrnTXsW7v9hiNEWEHngTqr`, surface "Shop App"
**Builds on:** DS-006

## What changed

- **Chips** (`AppChoiceChips`, new `component.chip` token): the selected chip is filled (`brand.primaryStrong`; blue in the Customer App theme) with white text and a translucent count; others are white with a strong border and the count in a soft pill.
- **Brand top bar** (`AppScaffold(brandBar: true)`, `AppTopBar.brand`, new `AppBrandBand`, `component.topBarBrand`): the Home tab's top bar is deep teal with white text, and a teal band continues under it.
- **Home tab**: title is the shop name; "Today's orders" on the band with the four order figures overlapping its edge; a full-width "Record a phone or counter order" button; To do; product figures; "Add from brand catalogue". A shop that isn't live shows its status card on the band ("Getting your shop ready") instead of the figures.

Every chip screen (Orders, Customers, Shades) and the Customer App's chips change with the shared component.

## Not in this feature

- The design's greeting with the person's name and date, the "Newest orders" list on Home, and initials avatars on the order page: small extras left for later.
- Bell icon for notifications: notifications are postponed (NOT-001).

## Checks

`flutter analyze` and `flutter test` in `flutter_shared` (96), Shop App (183) and Customer App (33); `pnpm tokens:check`, token tests, `pnpm ui:check`. Android emulator: Home (live shop) and Orders.
