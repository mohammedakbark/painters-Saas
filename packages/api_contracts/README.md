# API contracts

`openapi.json` is the API's OpenAPI document. It is **generated** from the NestJS
controllers and DTOs in `apps/api`; do not edit it by hand.

Regenerate after changing any endpoint, DTO or Swagger decorator:

```sh
pnpm --filter api openapi:export
```

CI regenerates the file and fails if the committed copy is out of date, so commit
the regenerated file together with the API change.

## Current scope

Only the infrastructure probes (`GET /health`, `GET /health/ready`) exist.
Generated client SDKs (TypeScript for `apps/admin_web`, Dart for the Flutter apps)
will be added here once real endpoints are stable; see
`docs/TECHNICAL_ARCHITECTURE.md` (API conventions).
