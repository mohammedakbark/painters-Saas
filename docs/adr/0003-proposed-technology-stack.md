# ADR 0003: Proposed Technology Stack

- **Status:** Proposed — requires technical approval
- **Date:** 2026-11-03
- **Decision owners:** Product / Engineering

## Context

The project is developed with Claude Code and needs a maintainable, cost-conscious stack suitable for a multi-tenant transactional SaaS.

## Proposed decision

Flutter for mobile; Next.js + TypeScript for web; NestJS + TypeScript modular monolith for backend; PostgreSQL + Prisma; Supabase for managed Postgres/Auth/Storage; Render for API; Vercel for web; Riverpod for Flutter state.

## Alternatives to review

- Next.js backend routes instead of NestJS.
- Render hosting for both web and API instead of Vercel + Render.
- Another managed PostgreSQL provider.
- Another authentication/SMS provider for Indian phone OTP.

## Consequences

This is a proposed baseline, not permission to create cloud resources or lock package versions. Verify provider capabilities, India OTP support, pricing, backups and regional latency before production decisions.

## Status update — 2026-11-03

Flutter, Next.js + TypeScript, NestJS, PostgreSQL and Prisma were accepted for the project foundation and implemented. Versions and toolchain decisions are in ADR 0004. Supabase (Postgres/Auth/Storage), Render, Vercel and Riverpod **remain proposed**; nothing for them has been provisioned or implemented.
