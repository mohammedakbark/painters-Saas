# CUS-005: Painter's sites

**Status:** Complete (local; API e2e, Flutter tests). Not seen on a device (the emulator was stopped for low memory on 2026-11-20).
**Decisions:** D-036 (painter or normal customer), D-049 (accurate map points), D-059 (order: cart, sites, checkout), D-060 (built in the new design)

## Goal

A painter keeps the places they work on, each with an accurate map pin, so they can order for a site from the first checkout (CUS-006). Normal customers have no sites.

## Behaviour

- **Sites tab** (painters only): active sites by name with owner and address; empty state; "Add site" in the action bar; "Archived sites" in the menu.
- **Add / edit site**: site name (required, 2–80 characters), owner name (optional), house or business name and place (required, 5–300), and the map pin (required, in India). Server messages show next to their field. Saving updates the list in place.
- **Map pin** (own screen so map drags don't fight the form): move the map under a fixed pin, or tap "My location" (precise location, asked only on tap; off, denied and blocked each have their own message, blocked offers Settings). Without maps in the build, the coordinates show as text.
- **Archive and restore**: archive from the site's menu after a confirmation; archived sites can be restored. Sites are never deleted.
- A painter who switches to Normal Customer keeps their sites; they come back when switching to Painter again.

## API (`/v1/me/sites`)

`GET` (active, or `?archived=true`), `POST`, `GET/PATCH /{siteId}`, `POST /{siteId}/archive`, `POST /{siteId}/restore`. Every query is keyed by the signed-in person, so nobody sees another person's sites (e2e test). Non-painters get 403 `painter_only`. Unique active name per painter (any case). At most 100 active sites per painter (an assumption of this feature to bound abuse, not an owner decision). Audit events record field names only, never the address or pin. Table `customer_sites` (migration `20261120140415_cus_005_painter_sites`), separate from the sites a shop records for its customers (`ShopSite`, D-055).

## Platform

Android adds `ACCESS_FINE_LOCATION` for "My location"; iOS updates the location usage text. Both are asked only on tap.

## Not in this feature

- Orders and spend per site and the site-spend card on Home (done in CUS-006 and CUS-007). A site now opens its spend page; Edit site is in its menu.
- A painter's site linking with a shop-recorded site (D-055): later.

## Checks

API: 122 unit, 208 e2e (7 for sites: painter only, pin required, unique names, edit, archive and restore, privacy between painters, switching type keeps sites). Flutter: Customer App 38 (5 new in `sites_test.dart`), shared 97, Shop App 183; `pnpm ui:check`. The shared `AppMenuButton` now wraps long labels instead of overflowing.
