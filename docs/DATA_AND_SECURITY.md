# Data, Tenant Isolation and Security Principles

**Status:** Mandatory baseline; detailed controls must be implemented and tested  
**Last updated:** 2026-11-03 (implemented controls added after AUTH-001)

This product handles customer identity information, shop business data, orders, bills, payments, credit and rewards. Security is a core product requirement.

## 1. Roles

Expected roles: Platform Super Admin, Shop Master Account, Shop Staff with assigned permissions, Customer and Painter (a customer profile type, not automatically shop staff). Platform permissions must not be inferred from shop membership.

## 2. Tenant isolation

- Every shop-owned record must be associated with its owning shop/tenant.
- The API must verify the authenticated user has an active membership and permission for the requested shop.
- Never trust a client-supplied `shopId` without checking membership.
- Apply tenant filters in service/repository query paths, not only controllers or UI.
- Use database foreign keys/constraints to prevent cross-tenant relationships where possible.
- Add automated tests attempting cross-tenant reads, updates, deletes and links.
- Customer-wide aggregation is allowed only for that authenticated customer's own records.
- Shop staff must never see another shop's data.

## 3. Master and staff permissions

- Shop creation creates one initial master account.
- The master role has protected permissions; ordinary staff cannot demote, remove or disable it.
- Staff accounts are scoped to one shop and least-privilege permissions.
- Platform-level recovery, suspension or ownership transfer must be audited.
- Hiding a menu item is not authorization.

## 4. Identity and authentication

- Prefer a managed identity provider over custom password/token cryptography.
- Phone OTP is the intended customer login direction, subject to Indian SMS-provider verification.
- OTP endpoints need rate limits, expiry, replay protection and abuse monitoring.
- Never log OTPs, passwords, tokens or secrets.
- Keep service-role keys/admin credentials on trusted server infrastructure only.
- Use secure token storage on mobile and secure session/cookie handling on web.

## 5. Identity documents and personal information

Identity documents are sensitive. Before implementing upload:
- Document the reason for collecting each field/document.
- Define which user types must verify and at what stage.
- Obtain appropriate consent and display a clear privacy notice.
- Restrict access to the smallest possible set of roles.
- Store documents in private object storage; use short-lived signed URLs.
- Record access to sensitive documents.
- Define retention and deletion rules.
- Never copy documents into logs, analytics, support tickets or test fixtures.

Shops should generally see verification status, not unrestricted access to raw documents.

## 6. Financial and credit records

- Each shop's credit approval and limit are private to that shop.
- Do not share one shop's outstanding balance with another shop.
- Do not create a platform-wide automatic painter credit score.
- A painter's shop reference may be one decision input, but each shop decides independently.
- Use auditable ledger entries for credit purchases, payments, adjustments and reversals.
- Use database transactions for bill settlement and payment allocation.
- Use idempotency protection where duplicate requests could create duplicate financial records.
- Record actor, timestamp and reason for sensitive adjustments.
- Do not silently edit finalized bills; use a documented adjustment process once tax rules are defined.

## 7. Reward points, commission and ratings

Keep separate ledgers/rules for customer reward points, painter commission/incentive, shop credit and money payments. Cancellations, returns, refunds and adjustments need explicit reversal rules.

Only a verified shop relationship or qualifying transaction can create a painter rating. Define visibility, consent, dispute/correction and anti-retaliation rules. A rating must not automatically approve or reject credit.

## 8. File uploads

- Validate file type, size and content.
- Use generated storage keys, not user-supplied paths.
- Separate public product/shop images from private documents.
- Use access policies and short-lived signed links for private files.
- Consider image resizing and metadata stripping.
- Never expose private buckets through public URLs.

## 9. Audit events

At minimum, audit shop creation/approval/suspension/ownership changes; account and role changes; credit approvals/limit changes; bill finalization/adjustments; payment creation/allocation/reversal/refund; reward/commission adjustments; rating creation/moderation; identity-document access and verification decisions; and platform-admin access to tenant data.

## 10. Privacy and compliance review

The initial market is India. Before production collection of identity documents or launch of financial/credit-related workflows, obtain appropriate privacy, security and legal review for applicable Indian data-protection, consumer, tax and payment requirements. This document is an engineering baseline, not legal advice.

## 11. Controls implemented so far

Keep this list accurate. It records what the code does today, not what is planned.

| Control | Where | Feature |
|---|---|---|
| Every API route requires a verified access token unless explicitly `@Public()` (only `/health`, `/health/ready`) | `apps/api/src/auth/auth.guard.ts` | AUTH-001 |
| Access tokens verified against the JWKS: asymmetric keys only (HS256 and `none` rejected), issuer, audience, expiry, `sub`/`iat`; anonymous sessions rejected | `apps/api/src/auth/access-token-verifier.ts` | AUTH-001 |
| Platform permission only from the `platform_admins` table, never from shop membership or token claims | `apps/api/src/platform-admin/platform-admin.guard.ts` | AUTH-001 |
| No public sign-up; platform admins created only by an audited operator script with a hidden password prompt and a 12-character mixed-case-and-digit policy | `apps/api/src/scripts/create-platform-admin.ts`, `infra/supabase/config.toml` | AUTH-001 |
| An identity is never linked automatically to another user's email/phone (409 `identity_conflict`) | `apps/api/src/users/users.service.ts` | AUTH-001 |
| Supabase secret key only in the API environment; web and mobile get the publishable key only (web keeps even that server-side) | `apps/api/.env`, `apps/admin_web/src/lib/env.ts` | AUTH-001 |
| Web session in HTTP-only, SameSite=Lax cookies (Secure in production); sign-in and sign-out are Server Actions | `apps/admin_web/src/lib/supabase/` | AUTH-001 |
| Wrong email and wrong password share one message (no account enumeration on the platform sign-in) | `apps/admin_web/src/lib/auth/sign-in.ts` | AUTH-001 |
| Every console page re-checks access (layouts are not an authorization boundary in Next.js) | `requirePlatformAdmin()` | AUTH-001 |
| Audit events are append-only (database trigger blocks UPDATE/DELETE for every role) and written in the same transaction as the change | migration `auth_001_identity`, `apps/api/src/audit/audit.ts` | AUTH-001 |
| Row Level Security enabled on every table (defense in depth against the Supabase Data API) | every migration | AUTH-001 |
| Errors are problem documents; unexpected errors return a bare 500 and are logged server-side; tokens, passwords and OTPs are never logged; env errors never echo values | `apps/api/src/common/http/`, `apps/api/src/config/env.ts` | AUTH-001 |
| E2E tests refuse to run against a database whose name does not contain "test" | `apps/api/test/test-env.ts` | AUTH-001 |
| Shop routes require membership of the shop in the URL; non-members (including platform admins), unknown and malformed ids all get the same 404 | `apps/api/src/shop-access/shop-access.guard.ts` | SHP-001 |
| Exactly one MASTER per shop (partial unique index); no API changes or removes memberships yet | migration `shp_001_shops` | SHP-001 |
| Registering a shop requires a verified mobile number; email-only accounts are refused | `apps/api/src/shops/shops.service.ts` | SHP-001 |
| The operator script never promotes an existing account to platform admin (sign-up is public) | `platform-admin-provisioning.ts` | SHP-001 |
| Framework 400 messages (which can echo input) are replaced by a generic detail | `problem-details.filter.ts` | SHP-001 |

Known gaps (tracked in `DECISIONS_AND_OPEN_QUESTIONS.md` questions 46–51):
- Access tokens remain valid until expiry after sign-out.
- No platform admin MFA or password reset yet.
- No API-level rate limiting yet (Supabase Auth rate-limits sign-in and OTP).
- The production SMS vendor is not chosen.
- Public email sign-up is possible (one global Supabase switch); such accounts have no access (question 51).
- No limit on shop registrations per person (question 49).
