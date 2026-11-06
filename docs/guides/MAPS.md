# Maps (OpenStreetMap)

The shop profile uses OpenStreetMap for the map, place search and address suggestions (D-041, SHP-006). No account, key or billing is needed.

## What is used

| Part | Service | Where |
|---|---|---|
| Map tiles (web and apps) | OpenStreetMap standard tiles, `https://tile.openstreetmap.org` | web `apps/admin_web/src/lib/maps/openstreetmap.ts`, apps `packages/flutter_shared/lib/src/maps/shop_location_map.dart` |
| Place search, address from a pin (web) | Nominatim, `https://nominatim.openstreetmap.org` | `apps/admin_web/src/lib/maps/openstreetmap.ts` |
| Map library | Leaflet 1.9.4 (web), flutter_map 8.3.2 (apps) | |

## Usage policies (free community services)

Both services are run by volunteers and the OpenStreetMap Foundation. Their policies apply:
- https://operations.osmfoundation.org/policies/tiles/
- https://operations.osmfoundation.org/policies/nominatim/

The code already follows the parts that affect it:
- **Attribution:** "© OpenStreetMap contributors" is always shown on the map.
- **One Nominatim request per second at most:** the web code spaces requests at least 1.1 s apart.
- **Search only when the owner asks:** search runs on **Search** or Enter, never while typing.
- **Address lookup only when the pin settles:** one lookup after the owner stops moving the pin, not one per drag step.
- **The app identifies itself:** browsers send the portal's address, and the apps send `app.sevenpalette` (update it with the final app IDs, question 41).

These services suit development and a small number of shops. There is no guarantee of service and heavy use can be blocked.

## Before launch: switch to a hosted provider

When real traffic starts, move tiles (and, if needed, search) to a hosted provider with an OpenStreetMap-based plan; several have free or low-cost tiers. Only these places change:
- web: `TILE_URL`, `TILE_ATTRIBUTION` and the Nominatim address in `apps/admin_web/src/lib/maps/openstreetmap.ts`;
- apps: `osmTileUrl` in `packages/flutter_shared/lib/src/maps/shop_location_map.dart`.

A provider key for tiles is public by design (it reaches the browser and the app). Restrict it to the portal's address and the app IDs, and keep it out of git.

## Privacy

What the owner types in the map search, and the pin's coordinates when the address is looked up, are sent from the browser to Nominatim (OpenStreetMap Foundation). Map tiles are requested for the area on screen. No account, phone number or other personal data is sent.

## Turning maps off in an app build

Set `"MAPS_ENABLED": false` in `apps/shop_app/config/local.json`. The profile then shows the coordinates instead of a map.
