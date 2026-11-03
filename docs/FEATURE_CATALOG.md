# Feature Catalog and Delivery Roadmap

Status meanings: **Confirmed** = stated requirement; **Proposed** = recommended design requiring review; **Open** = clarify before implementation; **Later** = deferred from initial scope.

## 1. Customer App

| Feature | Status | Notes |
|---|---|---|
| Mobile registration/login | Confirmed direction | Mobile OTP via Supabase Auth (D-021, D-022); SMS vendor open (question 46). |
| Customer type | Confirmed | Painter/Contractor or Normal Customer. |
| Profile and address | Confirmed | Exact fields to finalize. |
| Identity verification | Confirmed direction / Open details | Separate from shop credit approval; documents and timing open. |
| Discover shops and My Shops | Confirmed direction / Open workflow | Multiple shops can be kept; connection rules open. |
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
| One shared Shop App | Confirmed | Not a separate binary per shop/staff member. |
| Login-only access | Confirmed | Accounts are created on the web portal (shop self-registration, D-024); the Shop App never offers sign-up. |
| Master account created with shop | **Implemented (SHP-001)** | The registering person becomes the MASTER; the database allows one master per shop. One person may master several shops (D-026). |
| Role-based staff access | Confirmed direction | Additional staff seats may be paid later. |
| View/manage assigned orders | Confirmed direction | Depends on role. |
| Update order status | Confirmed direction | Exact statuses/transitions open. |
| Owner-only reports and credit exposure | Confirmed | Hidden from staff unless explicitly permitted. |

## 4. Shop Admin Web Portal

| Feature | Status | Notes |
|---|---|---|
| Shop self-registration (web) | **Implemented (SHP-001)** | Mobile OTP sign-in/up, register shop name + owner name; the shop starts as a private Draft. Spec: `docs/features/SHP-001-shop-registration-and-sign-in.md`. |
| Shop profile/onboarding checklist | Confirmed | Photo, address, support mobile, minimum 10 products before public discovery; then the owner submits for review (D-025). |
| Product/category/brand/pack management | Confirmed | Catalogue requirements in Product Overview. |
| Product images and shade codes | Confirmed | Storage and catalogue integration to decide. |
| Shop prices and offers | Confirmed | Customer-specific pricing rules need detail. |
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
| Shop onboarding review | Confirmed (D-025) | Approve after the owner completes the checklist and submits; only approved shops are visible to customers and painters (PLT-002). Rejection rules: question 50. |
| Suspend/reactivate shops | Proposed | Needs policy and audit trail. |
| Platform-level overview/configuration | Confirmed direction | Separate platform permissions. |
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

These phases are a proposal, not a delivery-date commitment. Approve each phase before work begins.

## Feature documentation rule

Before implementing a complex feature, create `docs/features/<feature-name>.md` from `docs/features/FEATURE_SPEC_TEMPLATE.md`. Do not implement a vague chat request without testable acceptance criteria.
