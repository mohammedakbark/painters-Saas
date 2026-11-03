# Development Workflow — One Feature at a Time

The product should be built incrementally. Do not ask Claude Code to implement the entire product in one request.

## 1. Before a feature

1. Read `CLAUDE.md` and `docs/PROJECT_STATE.md`.
2. Read relevant product/feature docs.
3. Check `docs/DECISIONS_AND_OPEN_QUESTIONS.md`.
4. Create/update `docs/features/<feature-name>.md` from the feature template.
5. Confirm acceptance criteria and unresolved rules.

## 2. Plan

Before broad implementation, Claude should identify:
- User problem and outcome.
- Roles and permissions.
- Main happy path and failure/edge states.
- UI screens/components.
- API endpoints/contracts.
- Database tables/migrations.
- Tenant/privacy implications.
- Tests and documentation to update.

For schema, credit, billing, identity or authorization changes, request review before implementation.

## 3. Implement in layers

1. Confirm domain rules and acceptance criteria.
2. Design database change/migration.
3. Implement backend logic and API validation.
4. Add authorization and tenant-scoped data access.
5. Add backend tests.
6. Implement UI using design-system components.
7. Add client state, API integration and error handling.
8. Add widget/component/integration tests.
9. Run formatters, static analysis, tests and builds.

Do not force tiny features into unnecessary layers. Use the architecture without creating empty abstractions.

## 4. Definition of done

- Agreed acceptance criteria are implemented.
- Roles/permissions are enforced on the backend.
- Tenant boundaries are tested where applicable.
- Loading, empty, error and success states are handled.
- Validation and edge cases are covered.
- Formatting/static analysis pass.
- Relevant automated tests pass.
- No secrets or real personal data were added.
- Feature documentation and `docs/PROJECT_STATE.md` are updated.
- Architecture changes have an ADR.
- Known limitations are reported.

## 5. Documentation updates

After implementation, update the feature spec, `docs/FEATURE_CATALOG.md`, `docs/PROJECT_STATE.md`, architecture docs and ADRs as appropriate. Documentation must describe actual code, not planned behavior.

## 6. Git workflow

Use small focused commits. Examples:
- `docs: add product foundation`
- `chore: scaffold monorepo`
- `feat(customer-app): add shop discovery`
- `feat(api): add shop catalogue endpoints`
- `fix(shop-app): correct order status transition`
- `test(api): cover cross-tenant order access`

Do not mix unrelated features. Never commit secrets, build output or local environment files.

## 7. End-of-task response

Claude should report: **Completed**, **Files changed**, **Verification**, **Documentation updated**, **Open issues**, and **Next recommended feature**. Do not claim a test/build/deployment passed unless it was actually run.
