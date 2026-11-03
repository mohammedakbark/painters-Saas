# ADR 0002: Shared Mobile Apps and Role-Based Web Portal

- **Status:** Accepted as product direction
- **Date:** 2026-11-03
- **Decision owner:** Product

## Context

The platform serves many customers and shops. A separate app binary for every shop or staff member would add unnecessary maintenance.

## Decision

Build one Customer App, one Shop App and one responsive web portal with separate Shop Admin and Platform Super Admin access areas.

## Consequences

- Apps are tenant-aware and role-aware.
- Shop accounts are created through web administration.
- A shop receives a protected master account when created.
- Staff permissions are enforced by the backend.
- Platform administration is protected separately from shop administration.
