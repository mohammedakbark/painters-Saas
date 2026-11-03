---
name: docs-sync
description: Synchronize project, feature, architecture and decision documentation after code or requirement changes.
---

# Documentation Sync

Use after every completed feature, architecture change or product decision.

1. Read `docs/PROJECT_STATE.md`.
2. Identify the behavior/decision that changed.
3. Update the relevant feature specification.
4. Update `docs/FEATURE_CATALOG.md` status.
5. Update `docs/TECHNICAL_ARCHITECTURE.md` if architecture changed.
6. Add/update an ADR for significant architecture decisions.
7. Move answered questions into confirmed decisions in `docs/DECISIONS_AND_OPEN_QUESTIONS.md`.
8. Update `docs/PROJECT_STATE.md` with actual completion and remaining work.

Rules: document actual code, not planned behavior; never invent dates/test results/versions/deployment status; keep project state concise; never copy secrets or customer data into docs.
