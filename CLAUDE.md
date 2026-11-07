# Project Instructions for Claude Code

## 1. Project identity

This is a multi-tenant SaaS platform for independent paint shops, painters and normal customers. The product name is not final. Repository documentation is the source of truth. Do not invent requirements, business rules, prices, legal requirements or user decisions. Distinguish confirmed decisions from proposals and open questions.

## 2. Required context before work

At the start of every task:
1. Read `docs/PROJECT_STATE.md`.
2. Read relevant sections of `docs/PRODUCT_OVERVIEW.md` and `docs/FEATURE_CATALOG.md`.
3. Read `docs/TECHNICAL_ARCHITECTURE.md` before architecture, database, API or deployment work.
4. Read `docs/DESIGN_SYSTEM.md` before UI work.
5. Read `docs/DATA_AND_SECURITY.md` before auth, permissions, customer data, credit, billing, payments or uploads.
6. Check `docs/DECISIONS_AND_OPEN_QUESTIONS.md` when anything is ambiguous.
7. Use the relevant skill under `.claude/skills/`.

Do not rely on old chat history when repository documentation has a newer decision.

## 3. Product boundaries

- There are two shared mobile apps: Customer App and Shop App.
- There is one responsive web portal with separate Shop Admin and Platform Super Admin areas and permissions.
- The platform is multi-tenant. A shop must never access another shop's private customers, orders, prices, credit, bills, staff or reports.
- Painters can manage multiple work sites. Normal customers use a simple shopping flow and do not need multiple-site management.
- Search shows the active shop first, then other shops separately. A customer must switch to the relevant shop before adding its product to the cart.
- A cart/order belongs to one shop; do not silently mix shops in checkout.
- Painter-only offers and commission/incentive information must not be exposed to normal customers.
- Credit is approved independently by each shop. Painter references may inform a decision but must never automatically approve or reject credit.
- Online payment gateway and SaaS subscription billing are not part of the initial implementation. Keep the architecture extensible without implementing them now.
- Do not add features merely because they are common in e-commerce apps. Check the product documents first.

## 4. Architecture and code quality

The proposed baseline is Flutter mobile, Next.js web, NestJS API, PostgreSQL, Prisma and Supabase-managed services. It is a proposal until Phase 0 is approved. Do not silently replace technologies.

- Prefer a modular monolith over microservices for the first version.
- Use feature-oriented modules and clear boundaries.
- Keep business rules out of UI widgets and controllers.
- Build reusable components where reuse is real; avoid abstractions for hypothetical future use.
- Avoid giant files/widgets, duplicated logic, magic values and unnecessary dependencies.
- Validate input at API boundaries.
- Use typed models and explicit error handling.
- Use migrations for schema changes. Never make undocumented manual production schema changes.
- Financial, credit, commission and reward records must be auditable and transaction-safe.

## 5. Multi-tenant and security rules

- Derive the authenticated user and active shop from verified server-side identity and membership. Never trust a client-supplied `shopId` without authorization checks.
- Enforce tenant authorization in the backend for every protected query and mutation. Frontend hiding is not security.
- Add tests proving that one shop cannot read or modify another shop's data.
- Never expose service-role keys, database credentials, OTP secrets or private storage credentials in mobile/web clients.
- Keep identity documents in private storage with restricted access. Do not build document upload until access, consent, retention and verification requirements are documented.
- Do not store/update financial balances by casually overwriting a number. Use auditable ledger entries and database transactions.
- Do not log OTPs, passwords, identity documents, access tokens or sensitive personal information.

## 6. UI and design system

Follow `docs/DESIGN_SYSTEM.md`. Its tokens are provisional, but do not introduce unrelated colors, fonts, radii or spacing values. Use one consistent design language on the web; the mobile apps may have their own fonts, colours and visual identity (D-042), still from shared tokens and components. Prioritize readable text, accessible contrast, responsive layouts, practical touch targets and clear shop context. Include loading, empty, error and success states.

Screens use only the shared components (D-039): `apps/admin_web/src/components/ui` on the web and `flutter_shared` components in Flutter (`AppButton`, `AppTextField`, `AppDropdown`, `showAppBottomSheet`, `showAppDialog`, `showAppSnackBar`, …), never raw framework controls, base radii or literal colours. Components take their looks from the component tokens in `packages/design_tokens/tokens.json`. If a screen needs a new kind of control, add it as a component first. `pnpm ui:check` enforces this in CI.

Lists and status (product owner, 2026-11-06; details in `.claude/skills/ui-implementation/SKILL.md`):
- Web lists that can pass about 20 rows use `DataTable` with server-side pagination and a filter per column kept in the URL. Mobile apps use mobile patterns (search, filter sheet, load more), never tables.
- Each status has its own token colour; opposite states (Available / Not available) must never look alike.
- UI rollout order: shop admin web, platform admin web, Shop App, Customer App.

Loading and updates (product owner, 2026-11-07, D-044): follow `.claude/skills/data-loading`. One change never reloads the whole page: static text renders at once, each data section loads on its own, search and filters use `UrlForm` (never a raw GET form), and a save shows its busy state on its own button and then updates only what changed.
- Work efficiently: small fixes need no plan or long report.

## 7. One-feature-at-a-time workflow

For every task:
1. State the exact feature and acceptance criteria.
2. Inspect existing code and relevant documentation.
3. Identify affected UI, API, database, permissions and tests.
4. Present a concise plan before broad or risky changes.
5. Implement only the requested feature and necessary supporting changes.
6. Run relevant formatting, static analysis, tests and build checks.
7. Review tenant isolation, permissions and edge states.
8. Update the feature document, ADR if needed, and `docs/PROJECT_STATE.md`.
9. Summarize files changed, tests run, limitations and next logical task.
10. Until go-live (D-035): when everything above is complete and green, fast-forward merge the feature branch into `dev`, push `dev` and delete the feature branch. Never merge a feature with failing or unrun required checks.

Do not mark a feature complete if acceptance criteria remain unmet or required tests were not run. Clearly report checks that could not be run.

## 8. Documentation is part of implementation

`docs/PROJECT_STATE.md` is the living tracker. Read it before every task and update it after every completed task or meaningful change. When behavior changes, update its feature document. When an architectural decision changes, add/update an ADR and the architecture document. Do not leave stale documentation.

## 9. Scope controls

- Do not implement paid subscriptions, paid-seat billing or online payment gateway integration in the initial phase.
- Do not implement a global automatic painter credit score.
- Do not assume inventory, tinting, GST invoice rules, delivery rules or public cross-shop price visibility until resolved.
- Do not create separate app binaries for individual shops or staff.
- Do not introduce microservices, Redis, a dedicated search engine or event streaming without a documented need.

When a decision materially affects security, tenant boundaries, financial records, data retention, deployment cost or a public user workflow, ask rather than guess.
