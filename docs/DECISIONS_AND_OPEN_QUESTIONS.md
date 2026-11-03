# Decisions and Open Questions

This document prevents assumptions from silently becoming requirements.

## 1. Confirmed product decisions

| ID | Decision | Status |
|---|---|---|
| D-001 | Build a shared multi-tenant SaaS platform for multiple paint shops. | Confirmed |
| D-002 | Build one shared Customer App and one shared Shop App. | Confirmed |
| D-003 | Build responsive web administration for shops and platform owner. | Confirmed |
| D-004 | Support Painter/Contractor and Normal Customer types. | Confirmed |
| D-005 | Multiple work sites are for painters; normal customers use a simple retail flow. | Confirmed |
| D-006 | Search shows active-shop products first and other shops separately. | Confirmed |
| D-007 | Customer switches to a product's shop before adding it to cart. | Confirmed |
| D-008 | Painters need combined site spending and separate shop-wise bills. | Confirmed |
| D-009 | Normal customers need separate shop bills but not site management. | Confirmed |
| D-010 | Each shop independently approves painter credit. | Confirmed |
| D-011 | Shop references may inform credit but do not automatically decide it. | Confirmed principle |
| D-012 | Shop activation requires photo, address, support mobile and at least 10 products. | Confirmed |
| D-013 | Shop App is login-only; accounts are created through web administration. | Confirmed |
| D-014 | Shop creation creates a protected master account. | Confirmed |
| D-015 | Customers can earn purchase points and redeem against eligible bills. | Confirmed direction |
| D-016 | Painter commission/incentive is distinct from customer reward points. | Required distinction |
| D-017 | Product shade/colour selection and colour-code field are required. | Confirmed |
| D-018 | Online payment gateway comes later. | Confirmed |
| D-019 | Subscription billing and paid-seat billing are not in the first build. | Confirmed |
| D-020 | Initial market Kerala, English UI, Android, iOS and responsive web. | Confirmed |
| D-021 | Supabase Auth is the identity provider. | Confirmed (product owner, 2026-11-03) |
| D-022 | Customers and shop users (master and staff) sign in with mobile OTP; Platform Super Admins sign in with email + password, with MFA added before production. | Confirmed (product owner, 2026-11-03) |
| D-023 | ~~In the first build, only Platform Super Admin creates shops.~~ **Superseded by D-024** the same day. | Superseded |
| D-024 | Anyone can register their shop themselves on the web portal (mobile OTP); the registering person becomes the protected master account. The Shop App stays login-only (D-013). | Confirmed (product owner, 2026-11-03) |
| D-025 | A self-registered shop is shown to customers and painters only after a Platform Super Admin approves it. The owner first completes the onboarding checklist (D-012) and submits the shop for review; the admin reviews the complete shop. | Confirmed (product owner, 2026-11-03) |
| D-026 | One person (one mobile number) may be the master account of several shops; each shop's data stays separate and every request works on one shop. | Confirmed (product owner, 2026-11-03) |

## 2. Proposed technical decisions — require approval

| ID | Proposal | Reason |
|---|---|---|
| P-001 | Flutter for both mobile apps. | Android/iOS from one codebase per app. |
| P-002 | Next.js + TypeScript for web portal. | One responsive portal for both admin areas. |
| P-003 | NestJS modular monolith for backend. | Clear modules without early microservice overhead. |
| P-004 | PostgreSQL with Prisma. | Relational, transaction-safe data. |
| P-005 | Supabase for managed Postgres/Auth/Storage. | Reduce infrastructure operations. |
| P-006 | Render for API and Vercel for web. | Managed deployment and previews. |
| P-007 | Riverpod for Flutter state. | Structured/testable state management. |
| P-008 | Inter font, navy/blue and amber accent. | Provisional visual direction. |
| P-009 | Shop-specific reward-point ledger. | Keeps each shop's reward liability separate. |
| P-010 | One shop per cart/order. | Avoid mixed-shop checkout complexity. |
| P-011 | Painter references visible to shops, not a public consumer score. | Limits unnecessary exposure of reputation data. |

Do not treat proposals as approved until the product owner confirms them.

**Status after foundation (2026-11-03):** P-001–P-004 were accepted for the foundation and implemented (ADR 0004). P-006 (Render/Vercel) and P-007 (Riverpod) remain proposals; nothing for them is implemented or provisioned. P-005: Supabase **Auth** is accepted (D-021) and implemented locally (ADR 0005); Supabase-managed Postgres and Storage remain proposals, and no Supabase project exists. P-008 is implemented as provisional tokens only.

## 2a. Confirmed technical decisions (foundation)

| ID | Decision | Source |
|---|---|---|
| T-001 | Monorepo: pnpm workspace for `apps/api` + `apps/admin_web`; Dart pub workspace for `apps/customer_app`, `apps/shop_app`, `packages/flutter_shared`. No Turborepo/Nx/Melos. | ADR 0004 |
| T-002 | Node.js 24 LTS. | Product owner, 2026-11-03 |
| T-003 | pnpm 12.16.1 as the JavaScript package manager. | Product owner, 2026-11-03 |
| T-004 | Flutter 3.47.9 pinned per project with FVM (`.fvmrc`); global SDK untouched. | Product owner, 2026-11-03 |
| T-005 | TypeScript ~6.0 (not 7.x) until the lint/test/Nest tooling supports 7. | ADR 0004 |
| T-006 | Prisma 7.10.1. Prisma Migrate owns the application schema. No models until a feature needs them. | ADR 0004 |
| T-007 | Local development database is plain PostgreSQL 17 in Docker Compose. The Supabase CLI stack is deferred until the auth decision. | ADR 0004 |
| T-008 | NestJS 12 official defaults: native ESM, oxlint, Vitest. Next.js 16 defaults: App Router, Turbopack, Cache Components. | ADR 0004 |
| T-009 | Supply-chain controls: pnpm 24 h minimum release age (strict), reviewed `allowBuilds`, CI actions pinned by SHA. | ADR 0004 |
| T-010 | API access tokens are verified in NestJS against the provider JWKS (asymmetric keys only); a global `User` is created just in time; platform permission lives only in `PlatformAdmin`. | ADR 0005 |
| T-011 | Local Supabase CLI (`infra/supabase`) runs Auth only; app data stays in the compose Postgres (T-007 still applies to app data). | ADR 0005 |
| T-012 | API validation uses Zod 4 with Nest's built-in Standard Schema pipe (answers question 43). | ADR 0006 |
| T-013 | Business routes are under `/v1`; errors are RFC 9457 problem details with a `code` extension (answers question 44). | ADR 0006 |
| T-014 | UUIDv7 primary keys, `timestamptz(3)`, cursor pagination (`limit` ≤ 50, `nextCursor`), RLS enabled on every table, append-only audit events. | ADR 0005, ADR 0006 |

## 3. Open product questions

### Shop onboarding and relationship
1. ~~Can a shop register itself, or can only Platform Super Admin create shops?~~ **Resolved (D-024, D-025):** shops self-register on the web; a platform admin approves them after the onboarding checklist.
2. Can a customer browse any shop without adding it to `My Shops`?
3. Does adding a shop happen immediately, by request/approval or invitation?
4. Can a shop edit its profile after activation, or are some changes platform-approved?
5. What is the master-account recovery and ownership-transfer process?

### Cross-shop search
6. Should other-shop results show selling price and stock, or only product/shop information?
7. Should results be limited by distance, customer-selected area or all registered shops?
8. Can customers save another shop's product before switching shops?

### Customer identity
9. Which customer types must complete identity verification?
10. Which documents or verification provider are acceptable?
11. Is verification required before ordering, before credit or only for specific actions?
12. Which roles can see verification status and raw documents?

### Products and inventory
13. Is stock quantity tracked in the first version or manually marked available?
14. Is inventory shared across web and mobile in real time?
15. Are tinting/mixing and manufacturer shade catalogues required in MVP?
16. Can a shop create custom shade codes, or must it select from brand catalogues?
17. Are customer-specific prices/discounts required at launch?

### Painter commission and rewards
18. Is commission calculated per product, brand, category, order or painter?
19. Is commission paid as cash, shop credit, discount, points or another settlement?
20. When is commission earned: order placement, fulfilment, bill settlement or another event?
21. Are reward points shop-specific? This is the recommended default.
22. What are point conversion, expiry, maximum redemption and cancellation/reversal rules?
23. Do normal customers and painters earn points under the same rules?

### Painter ratings and credit
24. Are ratings visible only to shops, to the painter, or to both?
25. What criteria should a shop rate: payment reliability, transaction history, communication or overall rating?
26. Can a painter dispute or respond to a rating?
27. How many completed transactions are required before a shop can rate a painter?
28. Is credit available only to painters, or can normal customers also receive shop credit?
29. How can a shop change a credit limit, and what approval/audit process is required?

### Orders, billing and payments
30. Does the shop approve every order before it is accepted?
31. Is pickup, delivery or both required at launch? What delivery zones/charges apply?
32. Are partial fulfilment, substitutions, cancellations and returns supported?
33. Can a bill be paid in multiple partial payments?
34. What is the running-bill and final-bill workflow?
35. What GST/tax invoice, numbering, rounding and credit-note rules apply?
36. Which offline payment methods can be recorded?

### Staff, web and premium features
37. What exact staff roles are needed initially?
38. Should staff account creation be limited by an entitlement setting before paid-seat billing exists?
39. Should customer-facing shop phone visibility be hidden until a future premium entitlement is active?
40. Is customer shopping required on web, or is responsive web only for shop/platform administration?

### Technical (raised during foundation)
41. What are the final Android application IDs and iOS bundle identifiers? Currently `com.example.*` placeholders, which the stores reject. This depends on the product name.
42. ~~Which auth/OTP provider will be used? Once decided, should local development move to the Supabase CLI stack?~~ **Resolved:** Supabase Auth (D-021); local development runs the Supabase CLI for Auth only (T-011). The SMS vendor is question 46.
43. ~~Which DTO validation approach will the API use (class-validator or Zod/Standard Schema)?~~ **Resolved:** Zod 4 + Standard Schema (T-012).
44. ~~What are the API versioning prefix (for example `/v1`) and the standard error-response shape?~~ **Resolved:** `/v1` and RFC 9457 problem details (T-013).
45. Are the hosting proposals (Supabase, Render, Vercel) approved? Before the first deploy, confirm Node 24 + pnpm 12 support on the chosen hosts.
46. Which SMS vendor sends production OTPs (for example MSG91 through Supabase's Send SMS Hook, or Twilio/Vonage), and who completes the DLT registration of the sender ID and OTP template? Required before customers or shop users can sign in on a hosted environment.
47. Platform admin MFA (TOTP) and password reset must exist before production. When should they be scheduled, and is TOTP acceptable as the second factor?
48. What session policy applies after sign-out or account removal? Access tokens stay valid until expiry (1 hour by default). Options: a shorter token lifetime, or a server-side session check for platform routes.
49. Should the number of shops one person can register, or have waiting as drafts/pending review, be limited? Today it is unlimited; unapproved shops are never visible to customers.
50. What does a platform admin do with a shop it does not approve: reject with a reason and allow resubmission, or something else? (Needed for the approval feature, PLT-002.)
51. Public email sign-up is technically possible because Supabase has one global sign-up switch; such accounts get no access. For the hosted project, which mitigation is preferred: email confirmations + CAPTCHA, or a before-user-created hook that only allows phone sign-ups?

## 3a. Temporary assumptions (foundation)

- App identifiers use Flutter's `com.example` placeholder (see question 41).
- Working display names "Customer App", "Shop App" and "Admin portal" are used until the product name is decided.
- Local database names `paintshop_dev` / `paintshop_test` are neutral placeholders and do not imply a product name.
- One platform role (`SUPER_ADMIN`) is enough for now; narrower platform roles are added only if the product needs them (AUTH-001).
- Shop registration asks only for the shop name and the owner's name; address, photo and support mobile are collected by the onboarding profile feature (SHP-001).
- Mobile numbers are Indian (+91) only for the initial Kerala market (SHP-001).
- Shop names are not unique across the platform (SHP-001).

## 4. Rules while questions are open

- Do not invent a business rule to unblock implementation.
- For low-impact UI details, use provisional design tokens and document assumptions.
- For database, credit, financial, privacy, access-control or tenant-boundary questions, stop and ask.
- If a temporary assumption is necessary, label it in the feature spec and add it here.
- When the product owner answers, move it to confirmed decisions and update affected docs.
