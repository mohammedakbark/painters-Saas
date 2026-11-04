# ADR 0008: Catalogue Model, Shared Brand Catalogue and Shop Listings

- **Status:** Accepted (product owner decision D-030, 2026-11-04). Implemented: the brand catalogue in CAT-001, shop listings in CAT-002.
- **Date:** 2026-11-04
- **Decision owners:** Product owner (catalogue sourcing), Engineering (data model)

## Context

Each paint brand has its own catalogue (product lines, pack sizes) and shade card (colour codes and names). The product owner wants:
- these brand catalogues available to every shop;
- shops able to add their own products and shades;
- shops able to mark the shades they commonly use (D-030).

Brands publish their catalogues only as web pages, with no data feed or licence (research, 2026-11-04). The product owner chose: platform admins fill the catalogue by hand or by CSV import from official shade cards and price lists, and brand websites are never scraped.

Availability is a switch per pack size (D-029). Prices are per shop (CLAUDE.md; question 6 on cross-shop price visibility is open).

## Decision

1. **Two layers:**
   - **Brand catalogue (global, platform-maintained, CAT-001):**
     - tables `catalogue_categories`, `brands`, `catalogue_products`, `catalogue_packs`, `shades`;
     - not tenant-owned and readable by any signed-in user;
     - changed only by platform admins, every change audited.
   - **Shop listings (tenant-owned, CAT-002):**
     - each shop's products, either linked to a brand-catalogue product or the shop's own;
     - per-pack prices (MRP and selling price) and availability;
     - the shop's own shades and favourite shades.
     - Every row carries `shop_id`; composite foreign keys keep a pack from pointing at another shop's product.
2. **What the brand catalogue holds:**
   - brand, product name, category, description, "supports shades" and pack sizes;
   - shades with code, name and an indicative screen colour.
   - It holds **no prices**: MRPs change and belong to each shop's listing.
3. **Identity rules:**
   - names are unique per scope regardless of case (a stored `name_key` = lower(name), so the rule is visible to Prisma and the drift check);
   - shade codes are stored upper case and are unique per brand.
4. **Archiving instead of deleting:** brands, categories, products and shades are archived (`active = false`) and hidden from the read API. Removing a pack size is refused once shops have listed it (409 `pack_in_use`, enforced by the foreign key from CAT-002).
5. **CSV import:**
   - all-or-nothing, with a dry run;
   - upserts by shade code or product name;
   - product pack sizes are only added, never removed;
   - limits: 2 MB and 5,000 rows.
6. **Product images:** the same pipeline as shop photos (ADR 0007). Platform admins upload only images they took or have permission to use.
7. **Shade colours** are catalogue data, never design tokens (DESIGN_SYSTEM §2). UIs always show the code and name as text; the colour is labelled indicative.

## Consequences

- **Benefits:**
  - Shops start from a ready catalogue instead of typing every product.
  - One correction in the brand catalogue fixes it for every shop.
- **Costs:**
  - Platform admins must maintain the brand data.
  - Accuracy depends on their source documents; brand permission for data use is a later step.
- **Pricing:** shop listings cannot copy prices from the brand catalogue; each shop enters its own (CAT-002).
- **Search:** case-insensitive substring search (`ILIKE`) with `(brand_id, name)` indexes. Trigram indexes or a search engine come only with a measured need (CLAUDE.md §9).

## Alternatives considered

- **Each shop types everything:** rejected by the product owner. It means repeated work and inconsistent product names across shops.
- **Copying from brand websites:** rejected (terms-of-use risk, data drift).
- **Prices in the brand catalogue:** rejected. Prices are shop-specific, and MRPs change too often for the platform to maintain.
