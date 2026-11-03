---
name: architecture-review
description: Evaluate proposed modules, dependencies, database changes and infrastructure choices against the approved project architecture.
---

# Architecture Review

Use before introducing a major dependency, module, database pattern, infrastructure service or cross-application abstraction.

Review:
1. Does it solve a confirmed product requirement?
2. Does it fit the modular-monolith architecture?
3. Does it preserve tenant isolation?
4. Does it introduce unnecessary operating cost?
5. Can the current stack solve it without another service?
6. Does it couple Flutter, web and backend unnecessarily?
7. Is the abstraction needed now or hypothetical?
8. What are migration, backup, monitoring and failure implications?
9. How will it be tested?
10. Does it require an ADR?

Prefer the simplest maintainable design. Do not introduce microservices, Redis, search engines or event streaming by default. Explain recommendation, alternatives, trade-offs, operational cost and documentation updates.
