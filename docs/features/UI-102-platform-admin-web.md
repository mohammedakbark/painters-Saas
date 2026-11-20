# UI-102: Platform Admin web in the new design

**Status:** Complete (local; web tests, build). Not checked in a browser: no platform admin session was available.
**Decision:** D-060 · **Design:** claude.ai artifact `VrnTXsW7v9hiNEWEHngTqr`, surface "Platform Admin"
**Builds on:** DS-006, UI-101 (shared sidebar and page bar)

## What changed

- Sidebar groups as in the design: Platform (Overview, Shops, Reviews with the waiting count), Brand catalogue (Catalogue), and Later with "Plans and seats" greyed out (D-060).
- Overview: "Waiting for review" is the filled lead tile; the Shops heading is for screen readers only, the Brand catalogue heading is smaller.
- Shops: status counts in segment chips.

## Not in this feature

- The design's review queue with shop photos and the "Shops by district" chart on the Overview: the platform summary API has no district figures, so they wait for an API change.
- The top-level "CSV import" item: import is per brand (`catalogue/brands/[brandId]/import`), so it stays on the brand page.
