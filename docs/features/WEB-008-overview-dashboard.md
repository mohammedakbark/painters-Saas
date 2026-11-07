# WEB-008: Overview dashboard v1

Status: **Complete (local; Chrome)**. Step A4 of the "Web first" roadmap. Order figures follow in ORD-003.

## Goal
The shop's first page shows its state at a glance: status, product availability, what needs attention, and how customers get orders.

## Behaviour (`/shops/{id}`)
- **Static heading** "Your shop at a glance"; each section loads on its own (PERF-001).
- **Status card:** shop name and status badge (Draft, In review, Changes requested, Live). Until the shop is Live the review panel (submit / withdraw) is shown, as before.
- **Products:** four stat tiles, each opening the product list with the matching filter:
  - **On sale** (and how many are archived);
  - **All sizes available**;
  - **Some sizes not available** (an info "Check" badge when more than 0);
  - **Not available** (a warning "Customers can't order" badge when more than 0).
  - Layout: two per row on phones and tablets, four per row from 1200 px.
- **To do:** until setup is done (or the shop isn't Live) this is the setup checklist. Afterwards it lists:
  - products with no size available;
  - own products without a photo;
  - delivery that is off (each with a link).
  - When there is nothing, "Nothing needs your attention right now."
- **Pickup and delivery:** "Delivery on" with charge, free-from amount and distance, or "Pickup only", with a link to Shop settings (SHP-008).
- **Shades and categories:** counts of favourite shades, own shades and own categories, with links.

## API
`GET /v1/shops/:shopId/catalogue/summary` returns:
- `products`: active, archived, allAvailable, partlyAvailable, noneAvailable, ownWithoutPhoto;
- `shades`: favourites, own;
- `ownCategories`.

Availability counts match the product list's `show` filter. Counts are scoped to the shop from verified membership, and other shops get 404.

## Components
`StatTile` (`components/ui/stat-tile.tsx`): a label, a value (text colours, compact above 10,000), optional context, an optional status badge (word plus tone) and an optional link. Used for every KPI row; order KPIs reuse it.

## Tests
- API e2e (`shop-catalogue.e2e-spec.ts`): the counts with partly, none and archived products and products without a photo; another shop's products are not counted; another owner gets 404.
- Web: `stat-tile.test.tsx`.
- Chrome:
  - ABC PAINTS (Live) shows the tiles, the to-do and delivery details;
  - a Draft shop shows the review panel and the setup checklist;
  - at 518 px the tiles sit two per row with no horizontal scroll;
  - no console errors.
