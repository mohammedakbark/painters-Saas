# Product Overview

**Working title:** Paint Shop SaaS Platform  
**Product name:** SevenPalette (D-040), a product of zero.byt  
**Initial market:** Kerala, India  
**Initial language:** English  
**Platforms:** Android, iOS and responsive web administration  
**Status:** Product definition; some workflows remain open  
**Last updated:** 2026-11-03

## 1. What this product is

A multi-tenant SaaS platform that helps independent paint shops digitize their catalogues, customer relationships, orders, painter incentives, credit accounts and billing. It connects paint shops, painters/contractors and normal customers. The platform owner operates one shared system; each shop remains an independent tenant whose private business data is isolated from every other shop.

This is more than a generic e-commerce app. Its differentiating workflow is:

**Painter → Shop → Site → Product → Order → Running Bill → Payment → Final Bill**

A painter may buy products for one work site from multiple nearby shops. The painter should understand total site expenditure while still seeing each shop's separate orders and bills. Each shop sees only its own transactions.

## 2. Why it is needed

Independent paint shops often handle product enquiries, orders, offers, painter relationships, credit and pending payments through calls, WhatsApp messages, notebooks or separate tools. The platform aims to:

- Give each shop a digital storefront without requiring it to build its own app.
- Make product discovery and ordering easier for painters and normal customers.
- Help shops manage offers and painter-specific incentives.
- Help painters organize purchases and expenses by work site.
- Make running bills, payments and outstanding amounts easier to understand.
- Give shops a structured way to manage painter credit decisions and transaction history.
- Encourage app-based purchases through reward points.
- Give the platform owner one system for onboarding and managing many shops.

These are product goals, not claims that market demand has already been validated.

## 3. Applications and user surfaces

### 3.1 Customer Mobile App

One shared Flutter app for all customer accounts. During registration, the user selects a type:
- **Painter / Contractor**
- **Normal Customer**

Common capabilities:
- Mobile-number-based registration/login (OTP is the proposed flow).
- Profile and address management.
- Discover registered paint shops and maintain a `My Shops` list.
- Select one active shop for the current storefront.
- Search across shops, showing the active shop's products first and other shops in a separate section.
- Open another shop's product details; switch to that shop before adding it to cart.
- Browse categories, product details, brands, pack sizes, prices and shade/colour information.
- Cart, checkout, order tracking, purchase history and shop-wise bills.
- Earn eligible purchase points and redeem them against eligible bills under shop rules.

Painter-specific capabilities:
- Manage multiple painting/work sites.
- Link purchases/orders to a selected site.
- View a site's combined expenditure across participating shops.
- View each shop's separate orders, bills, payments and outstanding amount.
- View painter-specific offers and product commission/incentive information where configured by a shop.
- View shop references/ratings based on genuine shop interactions.
- Request/use credit only where that shop has approved it.

Normal-customer capabilities:
- A simple retail flow similar to Amazon/Flipkart.
- Choose products based mainly on budget, quality, brand and suitability.
- Manage normal delivery/pickup details and view orders/bills.
- No multiple-site/project management.

### 3.2 Shop Mobile App

One shared Flutter app for all registered shops. It is login-only; shops/staff do not self-register from the mobile app.

- Shop accounts are created through web administration.
- Creating a shop automatically creates its initial protected **Master Shop Account**.
- The master account has fixed owner-level authority; ordinary shop users cannot demote it or remove its essential permissions.
- Additional staff accounts can have role-based permissions.
- Additional staff seats may become paid later. Subscription/seat billing is not part of the initial build.
- Staff see only the data/actions permitted by their role. Owner-level reports, total sales and credit exposure remain restricted unless explicitly permitted.

### 3.3 Shop Admin Web Portal

A responsive, tenant-scoped dashboard for each shop:
- Manage shop profile and onboarding completion.
- Manage products, categories, brands, pack sizes, prices, images and colour/shade codes.
- Configure offers and painter-specific incentives/commission.
- Manually promote or arrange products.
- Manage customers and painter relationships.
- Approve painter credit and set shop-specific limits/terms.
- Manage orders, site-linked purchases, running bills, payments and outstanding amounts.
- Manage staff accounts and permissions.
- View shop-specific reports and analytics.
- Configure reward-point rules and redemptions.

### 3.4 Platform Super Admin Web Portal

A platform-level area, potentially inside the same Next.js web application but with separate authorization and navigation:
- Create/review/approve/suspend/manage registered shops.
- Create the shop's master account as part of shop creation.
- View platform-wide operational information.
- Manage platform configuration and support onboarding.
- Prepare for future plans/seat entitlements without implementing subscription billing now.

Platform-level permissions must be separate from shop-admin permissions and audited.

## 4. Customer types and their different needs

### Painter / Contractor

Painters frequently buy products for active work sites and may have ongoing relationships with nearby paint shops. They need multiple sites, site-wise order/expense tracking, shop-specific offers/incentives, shop-specific credit approval, separate shop bills plus a consolidated site-spend view, and references from shops they have genuinely dealt with.

Painters may choose a product/shop partly based on the incentive/commission offered by that shop. This information is painter-only and must not be shown to normal customers.

Customers choose the Painter/Contractor type themselves and can change it later. A shop shows its painter-only information only after that shop confirms the person as its painter; each shop decides for itself (D-036).

### Normal Customer

A normal customer may be painting their own home or buying paint for a one-time requirement. They need a simple product-shopping flow and choose mainly based on budget, product quality, brand, pack size and suitability. They do not need multiple sites.

## 5. Shop discovery and cross-shop search

Customers can discover registered shops and keep multiple shops in `My Shops`. One shop is active at a time for the storefront and cart. Any Live shop can be browsed, and adding it to My Shops is instant (D-037). Finding shops lists every Live shop, nearest first, or by a district the customer picks when location is off (D-038).

Intended search behavior:
1. Show products from the currently selected shop first.
2. Show products from other registered/nearby shops in a separate section.
3. Allow opening another shop's product details.
4. Require switching the active shop before adding that product to cart.
5. Keep each cart/order tied to one shop; never silently mix shops in one checkout.

**Open:** whether cross-shop results display selling price and stock by default. Customer-specific discounts, painter commission and credit terms must never be exposed as public pricing.

## 6. Product catalogue

Expected fields/features:
- Brand, product name, category/subcategory and description.
- Intended use, pack size/quantity/unit.
- MRP and shop selling price.
- Product images.
- Available shades/colours.
- Manufacturer shade name/code and optional custom colour-code field.
- Stock/availability if inventory is included.
- Shop-specific offers.
- Painter-specific commission/incentive where configured.
- Product ordering and manual promotion controls.

Colour selection should support a shade/colour choice and a code field. Do not assume arbitrary RGB colours are orderable paint shades. Manufacturer shade catalogues, inventory and tinting workflows need separate requirements.

## 7. Orders, sites, bills and payments

### Orders

Each order belongs to exactly one shop and one customer. A painter's order may also link to one of that painter's sites. A normal customer's order does not need a site. Pickup/delivery, shop approval, partial fulfilment, cancellation and returns need final rules before implementation.

### Painter sites

A painter can create sites such as `Green Villa`. A site can contain purchases from multiple shops. The painter sees combined site expenditure, products/orders, separate shop-wise bills/payments and outstanding balances by shop, plus a final site summary when work is completed. A shop sees only its own orders, bills, payments and credit exposure.

### Normal customer bills

Normal customers do not need sites, but must see separate orders and bills for each shop they purchase from.

### Payments and financial records

The initial version records offline payments such as cash, UPI or bank transfer according to shop configuration. Online payment gateway integration comes later. Bills, payments, credit, rewards and commissions must be auditable and transaction-safe. Use ledger entries rather than unexplained balance overwrites. GST invoice, tax, invoice-numbering and credit-note rules remain open.

## 8. Credit and painter shop references

Credit is approved independently by each shop. A painter may have credit with one shop and no credit with another. Each shop controls its own approval, limit and terms, and tracks its own credit purchases, payments and outstanding amount.

Shops may rate painters based on genuine experience. Other shops may use the number and quality of references as one input when deciding whether to offer credit. Safeguards:
- Only shops with a verified relationship/completed transaction can rate.
- Show rating count and context; one rating is not a universal truth.
- Credit approval remains with the individual shop; no automatic credit score or automatic approval/denial.
- Define visibility, consent, dispute/correction and anti-retaliation rules before launch.
- Never expose another shop's private credit limits or balances.

A rating is a reference signal, not proof that a painter will repay another shop.

## 9. Rewards and painter incentives

Keep these as separate concepts:

**Customer reward points:** points earned for eligible app purchases and redeemed against eligible bills. Recommended default: a separate ledger for each shop. Rules still needed for earning, conversion, expiry, redemption cap, cancellations and whether both customer types earn points.

**Painter commission/incentive:** shop-configured product/painter incentive that may influence painter product choice. Calculation, accrual, payout/settlement, visibility and reversals are open. Do not merge it with customer reward points.

## 10. Shop onboarding and account model

A shop can save a draft profile easily, but must complete a checklist before becoming publicly discoverable:
- Shop photo.
- Shop address.
- Customer-support mobile number.
- At least 10 products.

The shop app is login-only. Accounts are created through web administration. Creating a shop creates its protected master account. Whether shops self-register or are created only by Platform Super Admin is open.

Customer-facing visibility of the shop's mobile number may become a premium feature later. The support number is still required during onboarding. Do not implement premium gating/subscription billing now.

## 11. Identity verification and privacy

Identity verification is separate from shop credit approval. The product may require identity verification, especially for painters or credit-related workflows, but document types, verification provider, who must verify and when are not finalized.

Do not collect identity documents until the reason, access roles, consent, storage, retention and deletion rules are documented. Shops should normally see verification status rather than unrestricted raw documents.

## 12. Business model and future scope

Long term, many independent shops use the same platform and pay for premium access. Initial development must not build subscription checkout, recurring subscription billing or paid-seat billing. Keep shop entitlements/staff-seat limits extensible. Possible future premium features include additional staff seats, customer-facing shop phone visibility and advanced analytics/promotions.

## 13. Initial scope and non-goals

- Initial geography: Kerala, India; UI language: English.
- Mobile: Android and iOS.
- Web: responsive Shop Admin and Platform Admin portal. Customer shopping on web is not yet confirmed.
- No subscription billing, paid-seat billing or online payment gateway in the initial build.
- No separate app binary per shop.
- No automatic credit scoring.
- No microservices, Redis, dedicated search engine or tinting integration without a documented need.

## 14. Product principles

Easy shop onboarding; simple normal-customer shopping; useful painter site management; clear ownership of every product/order/bill/credit record; strong tenant isolation; maintainable architecture; incremental implementation with one documented and tested feature at a time.
