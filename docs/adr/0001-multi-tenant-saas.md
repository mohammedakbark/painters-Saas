# ADR 0001: Shared Multi-Tenant SaaS Platform

- **Status:** Accepted as product direction
- **Date:** 2026-11-03
- **Decision owner:** Product

## Context

The platform must support many independent paint shops while providing one shared customer experience and one shared shop-side app.

## Decision

Build one multi-tenant platform. Each shop is a tenant with isolated private business data. Customers may interact with multiple shops using one customer identity.

## Consequences

- Shop-owned records require tenant ownership.
- Backend authorization and cross-tenant tests are mandatory.
- Shop-specific credit, prices, bills, staff and reports remain private.
- The platform owner has separate platform-level administration.
- Future subscriptions can be added without a separate app for each shop.
