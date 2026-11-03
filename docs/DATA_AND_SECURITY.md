# Data, Tenant Isolation and Security Principles

**Status:** Mandatory baseline; detailed controls must be implemented and tested  
**Last updated:** 2026-11-03

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
