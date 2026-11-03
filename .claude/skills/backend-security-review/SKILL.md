---
name: backend-security-review
description: Review backend, database and API changes for tenant isolation, role authorization, privacy and financial integrity.
---

# Backend Security Review

Use whenever changing auth, authorization, tenant data, customer identity, files, credit, bills, payments, rewards, commission or ratings.

## Identity and access
- Verify authenticated identity from a trusted token.
- Resolve shop membership and role on the server.
- Never trust a client-provided shop/tenant ID without checking membership.
- Enforce least privilege and protect the Master Shop Account.
- Keep platform permissions separate from shop roles.

## Tenant isolation
- Scope every shop-owned query/mutation to the authorized tenant.
- Check related records belong to the same tenant.
- Prevent cross-tenant IDs from being linked through payloads.
- Add tests with at least two shops proving unauthorized read/write attempts fail.
- Do not rely on UI visibility or a client-stored role.

## Sensitive data
- Never log passwords, OTPs, tokens, identity documents or sensitive personal data.
- Keep service keys server-side.
- Keep identity documents private and use short-lived authorized access.
- Do not build document upload before consent, access and retention rules are documented.

## Financial integrity
- Use database transactions for bill/payment/credit/reward changes.
- Keep auditable ledger entries and reversals.
- Consider idempotency for retryable operations.
- Do not overwrite balances without transaction history.
- Do not expose one shop's credit balance or terms to another shop.

## Ratings and output
Only qualifying verified shop relationships can rate a painter. Do not implement automatic credit approval/denial from ratings. Report findings by severity, affected endpoint/entity, exploit scenario and recommended fix. State which tests were actually run.
