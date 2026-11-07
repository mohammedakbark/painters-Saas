# Feature Catalog and Delivery Roadmap

Status meanings: **Confirmed** = stated requirement; **Proposed** = recommended design requiring review; **Open** = clarify before implementation; **Later** = deferred from initial scope.

## 1. Customer App

| Feature | Status | Notes |
|---|---|---|
| Mobile registration/login | Confirmed direction | Mobile OTP via Supabase Auth (D-021, D-022); SMS vendor open (question 46). |
| Customer type | Confirmed (D-036) | Painter/Contractor or Normal Customer, chosen by the customer and changeable. A shop's painter-only information appears only after that shop confirms the painter. |
| Profile and address | Confirmed | Exact fields to finalize. |
| Identity verification | Confirmed direction / Open details | Separate from shop credit approval; documents and timing open. |
| Discover shops and My Shops | Confirmed (D-037, D-038) | Any Live shop can be browsed; adding it to My Shops is instant. Find shops lists all Live shops nearest first, or by a chosen district. |
| Active shop selector | Confirmed | One active storefront at a time. |
| Cross-shop product search | Confirmed | Active shop first, other shops separately. |
| Other-shop product details | Confirmed | Can view details without switching. |
| Switch shop before adding to cart | Confirmed | One shop per cart/order is proposed. |
| Catalogue, categories and product details | Confirmed | Include brand, pack, price, colour/shade details. |
| Shade selection and colour code | Confirmed | Manufacturer shade integration open. |
| Cart, checkout and order history | Confirmed | Fulfilment lifecycle open. |
| Shop-wise bills | Confirmed | Required for normal customers and painters. |
| Reward points | Confirmed direction | Earn and redeem against eligible bills; policy open. |
| Shop phone visibility | Later / Open | Possible premium feature; no premium billing in MVP. |

## 2. Painter Features

| Feature | Status | Notes |
|---|---|---|
| Multiple work sites | Confirmed | Painter only; normal customers do not need sites. |
| Create/edit/archive sites | Confirmed direction | Lifecycle to define. |
| Attach orders to sites | Confirmed | A painter's order may be site-linked. |
| Combined site expenditure | Confirmed | Across shops, visible to the painter. |
| Separate shop bills within a site | Confirmed | Preserve shop-wise transaction detail. |
| Shop-specific credit | Confirmed | Each shop independently approves and sets terms. |
| Painter offers and commission/incentives | Confirmed direction / Open rules | Separate from customer reward points. |
| Shop references/ratings | Confirmed direction / Open safeguards | Only genuine shop relationships should rate. No automatic credit score. |

## 3. Shop Mobile App

| Feature | Status | Notes |
|---|---|---|
| One shared Shop App | Confirmed / sign-in (SHP-002) and catalogue (SHP-005) implemented | Not a separate binary per shop/staff member. Mobile OTP sign-in, shop list, shop home, profile and the everyday catalogue (products, prices, pack sizes, availability, archive, add from the brand catalogue, product photos). Own products and shades stay on the web. Specs: `docs/features/SHP-002-shop-app-sign-in.md`, `docs/features/SHP-005-shop-app-catalogue.md`. |
| Login-only access | Confirmed | Accounts are created on the web portal (shop self-registration, D-024); the Shop App never offers sign-up. |
| Master account created with shop | **Implemented (SHP-001)** | The registering person becomes the MASTER; the database allows one master per shop. One person may master several shops (D-026). |
| Role-based staff access | Confirmed direction | Additional staff seats may be paid later. |
| View/manage assigned orders | Confirmed direction | Depends on role. |
| Update order status | Confirmed direction | Exact statuses/transitions open. |
| Owner-only reports and credit exposure | Confirmed | Hidden from staff unless explicitly permitted. |

## 4. Shop Admin Web Portal

| Feature | Status | Notes |
|---|---|---|
| Public home page (web) | **Implemented (WEB-001)** | Product site at `/`: what the platform provides, vision and mission, Login/Register, store buttons (Coming soon). No platform admin entry. Spec: `docs/features/WEB-001-public-home-page.md`. |
| Sign in and Register (web) | **Implemented (WEB-002)** | `/sign-in` and `/register` (2 steps: verify mobile, shop details) in a shared premium layout. Spec: `docs/features/WEB-002-sign-in-and-registration.md`. |
| Your shops (web) | **Implemented (WEB-003)** | `/shops` after sign-in: shop cards with status, Register another shop, getting-started steps when there is no shop. Spec: `docs/features/WEB-003-my-shops.md`. |
| Shop console look (web) | **Implemented (WEB-004)** | Sidebar and phone header with the shop, icon navigation; overview setup guide with progress; profile and catalogue pages in cards. Spec: `docs/features/WEB-004-shop-console.md`. |
| Product list (web) | **Implemented (CAT-006)**, replacing the CAT-003 pack table | One row per product with photo, pack-size chips with prices, availability summary; toolbar filters (search, brand, category, pack size, availability, sort); Litres/Kilograms/Pieces tabs; pagination; ⋯ actions. Spec: `docs/features/CAT-006-product-list.md`. |
| Shop settings (web) | **Implemented (SHP-008)** | Pickup always offered; delivery on/off with flat charge (₹0 = free), optional free-delivery amount and a km distance from the shop pin (D-046, D-049); ready-made order messages (D-045), add/edit in side sheets. Spec: `docs/features/SHP-008-shop-settings.md`. |
| Shades (web) | **Implemented (WEB-006)** | Tabs Favourites, Brand shades and My shades; each a table with swatch, search and numbered pages; add or remove favourites and own shades. Spec: `docs/features/WEB-006-shades-table.md`. |
| Console navigation v2 (web) | **Implemented (WEB-005)** for the existing sections; new sections appear with their modules | Collapsible sidebar (icons + labels, or icons with tooltips); current shop at the top with a shop switcher; sections Overview, Orders, Products, Shades, Categories, Users, Mobile Apps, later ERP modules (each shown once its module exists); profile menu at the bottom (profile, My shops, shop details and photos, settings, sign out). Desktop, tablet and phone. |
| Business dashboard after approval (web) | Planned (UI pass, owner 2026-11-06); needs orders (Phase 2) | Once the shop is Live the onboarding checklist gives way to KPIs (customers, products, orders, pending orders, sales), charts, filters and quick actions, with loading, empty and error states. |
| Guided first-products setup (web) | **Implemented (CAT-004)** | A short guided path to the first 10 products: search, choose several, price them in one place, clear validation. |
| Add product (web) | **Implemented (CAT-005)** | One flow: search every brand; picked brand products autofill (locked); not found → new product with Sold by, prices and photo. D-043. Spec: `docs/features/CAT-005-add-product.md`. |
| Row action menu in tables (web) | **Implemented (WEB-005)** on the catalogue table | A ⋯ menu per row: Edit, Mark available / Not available, Archive / Restore, Remove pack size; room for later actions. Destructive actions confirm; owner-only actions follow permissions. Products are archived, not deleted (open question 55). |
| Shop self-registration (web) | **Implemented (SHP-001)** | Mobile OTP sign-in/up, register shop name + owner name; the shop starts as a private Draft. Spec: `docs/features/SHP-001-shop-registration-and-sign-in.md`. |
| Shop profile/onboarding checklist | Confirmed / **profile + checklist implemented (SHP-003)** | Address, map location (OpenStreetMap picker with search, or current location; D-027, D-041), support mobile, the shop photo (SHP-004) and 10 products (CAT-002) are on the checklist; the owner then submits for review (D-025, PLT-002). Spec: `docs/features/SHP-003-shop-profile-and-location.md`. |
| Product/category/brand/pack management | Confirmed / **brand catalogue implemented (CAT-001)** | Platform admins maintain categories, brands, products with pack sizes and shades, by hand or CSV import (D-030, ADR 0008). Shop listings implemented in CAT-002 (products from the brand catalogue or own, pack sizes, archive). Specs: `docs/features/CAT-001-platform-brand-catalogue.md`, `docs/features/CAT-002-shop-catalogue.md`. |
| Product images and shade codes | Confirmed | Storage decided and implemented for shop photos (ADR 0007, SHP-004): product images reuse the same pipeline in CAT-001/CAT-002. |
| Shop prices and offers | Confirmed / **pack prices implemented (CAT-002)** | Each shop sets a price (and optional MRP; price ≤ MRP, assumption) per pack size, in paise. No per-customer prices (D-031); painter discounts and commission come later. |
| Product availability | **Implemented (CAT-002)** | Available/unavailable switch per pack size (D-029). Customer requests for unavailable items come with the Customer App. |
| Favourite and own shades | **Implemented (CAT-002)** | Shops mark favourite brand shades and add their own shade codes (D-030). |
| Manual product promotion/order | Confirmed | Shop can promote selected products. |
| Painter commission configuration | Confirmed direction / Open rules | Calculation and settlement not finalized. |
| Customer/painter management | Confirmed | Shop sees only its own relationships. |
| Credit approval and limits | Confirmed | Shop-specific. |
| Orders and fulfilment | Confirmed direction / Open lifecycle | Pickup/delivery and partial fulfilment need clarification. |
| Bills and manual payment records | Confirmed | Online gateway later. |
| Reward-point rules | Confirmed direction / Open rules | Shop-specific ledger proposed. |
| Staff accounts and roles | Confirmed direction | Paid-seat billing later. |
| Reports/analytics | Confirmed direction | Exact metrics/permissions open. |
| Inventory/stock | Open | Confirm scope before schema/UI. |
| Tinting/colour mixing | Open / Later candidate | Do not assume integration. |

## 5. Platform Super Admin

| Feature | Status | Notes |
|---|---|---|
| Platform admin sign-in | **Implemented (AUTH-001)** | Email + password; MFA and password reset before production. Spec: `docs/features/AUTH-001-platform-admin-sign-in.md`. |
| Create/manage shops | Changed (D-024) | Shops self-register. **Read-only shop registry implemented (PLT-001):** the platform admin lists and opens registered shops. Spec: `docs/features/PLT-001-platform-shop-registry.md`. |
| Shop onboarding review | Confirmed (D-025, D-032, D-033) / **implemented (PLT-002)** | The owner submits a complete shop; a platform admin approves it (Live) or requests changes with reasons and a note; the owner fixes and resubmits. Profile, photo and location are locked while in review; products never. Spec: `docs/features/PLT-002-shop-review.md`. |
| Suspend/reactivate shops | Proposed | Needs policy and audit trail. |
| Platform-level overview/configuration | Confirmed direction | Separate platform permissions. |
| Brand catalogue management | **Implemented (CAT-001)** | Categories, brands, products, pack sizes, shades, product images, CSV import with dry run; audited. |
| Future plans/seat entitlements | Later | Architecture-ready only; no billing now. |

## 6. Backend/platform capabilities

| Capability | Status | Notes |
|---|---|---|
| Shared multi-tenant database | Confirmed | Strong isolation between shops. |
| Global customer identity | Proposed / foundation implemented | Global `User` linked to the Supabase account (AUTH-001); customer profile comes with customer registration. |
| Shop membership and roles | Master implemented (SHP-001) | Staff roles come with staff management. |
| Tenant authorization on every API | Mandatory / implemented for shop routes | `ShopAccessGuard` on every `/v1/shops/:shopId` route; cross-tenant e2e tests (SHP-001). |
| Audit trail | Mandatory for sensitive actions | Credit, bills, payments, role changes, ratings and platform actions. Append-only `audit_events` table implemented (AUTH-001). |
| Transaction-safe financial ledger | Mandatory | No unexplained balance overwrites. |
| OpenAPI/Swagger | Implemented | `/docs` outside production; contract exported to `packages/api_contracts/openapi.json` and checked in CI. |
| Online payment gateway | Later | Explicitly deferred. |
| SaaS subscription billing | Later | Explicitly deferred. |
| Dedicated search engine | Later | Start with PostgreSQL search and measure. |
| Single-source design tokens and brand names | **Implemented (DS-001)** | `packages/design_tokens` generates the web theme and Flutter tokens; rebrand in one place (D-034). Spec: `docs/features/DS-001-design-tokens.md`. |
| The project's own UI components | **Implemented (DS-002)** | Every control in a screen is a project component styled from component tokens, on the web (`components/ui`) and in Flutter (`flutter_shared`); `pnpm ui:check` in CI (D-039). Spec: `docs/features/DS-002-components.md`. |

## Suggested implementation phases

### Phase 0 — Foundation
- Approve architecture and hosting direction.
- Create repository structure and local development environment.
- Set up formatting, linting, testing and CI.
- Establish design tokens and reusable foundations.
- Define authentication, roles and tenant boundaries.

### Phase 1 — Shop onboarding and catalogue
- ~~Platform admin shop creation and master-account creation.~~ Replaced by shop self-registration (SHP-001, done) and a platform shop registry plus review (PLT-001, PLT-002).
- Shop profile completion checklist.
- Product/category/brand/pack management.
- Product images and shade/colour-code fields.
- Shop Admin web foundation and Shop App login shell.

### Phase 2 — Customer discovery and ordering
- Customer registration/profile and painter/normal type.
- Shop discovery and My Shops.
- Active shop selector and cross-shop search.
- Product details, cart, checkout and order placement.
- Shop order management and order status.
- Shop-wise customer order history and bills.

### Phase 3 — Painter sites, billing and credit
- Painter site management and site-linked orders.
- Combined site expenditure and separate shop-wise bills.
- Running/final bills and manual payment records.
- Shop-specific credit approval, limits and ledger.

### Phase 4 — Rewards and painter references
- Shop-specific reward ledger and redemption.
- Painter commission/incentive rules.
- Verified shop references/ratings, consent, dispute and audit controls.

### Phase 5 — Release readiness
- Security and tenant-isolation testing.
- Backup/restore checks, monitoring and error reporting.
- App-store release preparation and production runbooks.

### Later — ERP modules
- The long-term goal is a complete paint-shop ERP: inventory, purchasing, billing and payments, customers, staff, reporting and more.
- Each module is added one at a time after the product owner approves its scope; none is in the current scope.

These phases are a proposal, not a delivery-date commitment. Approve each phase before work begins.

## Feature documentation rule

Before implementing a complex feature, create `docs/features/<feature-name>.md` from `docs/features/FEATURE_SPEC_TEMPLATE.md`. Do not implement a vague chat request without testable acceptance criteria.
