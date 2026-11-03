---
name: feature-cycle
description: Plan, implement, test and document one product feature at a time using this project's requirements, architecture and acceptance criteria.
---

# Feature Cycle

Use this skill whenever implementing or materially changing a product feature.

## Before implementation
1. Read `CLAUDE.md` and `docs/PROJECT_STATE.md`.
2. Read relevant product and feature documentation.
3. Check `docs/DECISIONS_AND_OPEN_QUESTIONS.md`.
4. Create/update a feature spec from `docs/features/FEATURE_SPEC_TEMPLATE.md`.
5. Write testable acceptance criteria.
6. Identify UI, API, database, permissions, tenant boundaries and tests.
7. Present the plan before broad changes.

## Implementation
- Work on one feature only.
- Reuse existing architecture and design-system components.
- Keep business rules out of UI.
- Validate API inputs.
- Enforce permissions in the backend.
- Keep tenant-owned data tenant-scoped.
- Use migrations for schema changes.
- Use transactions for financial/reward/credit operations.
- Do not add unrelated refactors or dependencies.

## Verification
Run relevant formatters, analyzers, tests and builds. Add tests for happy path, validation/error cases, loading/empty states, permission failures, cross-tenant access attempts and duplicate/concurrent financial operations where relevant. Report checks that could not run.

## Documentation
Update the feature specification, `docs/FEATURE_CATALOG.md`, `docs/PROJECT_STATE.md`, architecture docs and ADRs as needed. Summarize files changed, tests run, limitations and next feature.
