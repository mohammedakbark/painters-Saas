---
name: code-review
description: Review current changes for correctness, maintainability, security, test coverage and consistency with project documentation.
---

# Code Review

Review the current diff. Do not edit files unless the user explicitly asks for fixes.

Review order:
1. Correctness and acceptance criteria.
2. Authentication, authorization and tenant isolation.
3. Data integrity, transactions and financial/reward logic.
4. Error handling and edge cases.
5. Maintainability, duplication and unnecessary abstractions.
6. UI consistency and accessibility.
7. Test coverage and reliability.
8. Documentation accuracy.
9. Dependency and performance impact.

Report critical findings first. For each finding include severity, file/area, problem, realistic impact and recommended fix. Then list missing tests/docs and what was/was not run. Do not report personal style preferences as bugs.
