# ADR 0007: Provider Portability and Free-Tier Development

- **Status:** Accepted (product owner decision D-028, 2026-11-04; storage implemented in SHP-004)
- **Date:** 2026-11-04
- **Decision owners:** Product owner (cost and providers), Engineering (boundaries)

## Context

The product owner wants every external service on a **free tier until there are real customers**, and every provider **replaceable later**, including the database (D-028). SHP-004 needs the first file storage (shop photos). SHP-003 added the first map provider (Google Maps, D-027).

Research on 2026-11-04 (re-check before relying on the numbers):
- **Supabase Storage, free plan:** 1 GB of storage, 50 MB maximum per file, about 5 GB of egress per month. Free projects pause after a week of inactivity. Source: https://supabase.com/docs/guides/storage/pricing
- **Cloudflare R2, free tier:** 10 GB of storage, no egress fees, 1 million Class A and 10 million Class B operations per month.
- **S3 protocol:** both services support it, as do AWS S3 and Backblaze B2.
- **Local development:** MinIO stopped publishing free Docker images in October 2025. The Supabase CLI already in the repo (2.122.0) runs Storage locally with an S3-compatible endpoint (`[storage.s3_protocol]`).
- **Maps:** OpenStreetMap since D-041 (no account or billing; free community services with usage policies). Before that, Google Maps Platform:
  - free usage per API (SKU) per month (higher under India pricing);
  - the mobile Maps SDKs are free and unlimited;
  - a billing account is required and there is no automatic spending cap.

## Decision

1. **Database:** standard PostgreSQL through Prisma only.
   - No feature that ties the data to Supabase: no PostgREST, no database functions or triggers that depend on Supabase, no Supabase-specific extensions.
   - RLS stays enabled only as defence in depth (ADR 0005).
   - Hosting can be Supabase Postgres (free), Neon (free) or any PostgreSQL; moving is `pg_dump`/`pg_restore` plus `DATABASE_URL`.
2. **File storage:** behind the `ObjectStorage` port (`apps/api/src/storage/`), implemented with the **S3 protocol** (`S3ObjectStorage`, `@aws-sdk/client-s3`).
   - **Local:** Supabase CLI Storage (`infra/supabase/config.toml`; `pnpm supabase:start` also seeds the `shop-media` bucket).
   - **First hosted environment:** Supabase Storage free tier.
   - **When images grow:** Cloudflare R2 (zero egress).
   - **Switching** means changing the `STORAGE_*` variables and copying the objects. The database stores **object keys only**, never full URLs; public URLs are derived from `STORAGE_PUBLIC_BASE_URL`.
   - **Only the API writes to storage**, with server-only credentials. Clients receive public URLs of re-encoded images.
   - **Image transformations** (a paid Supabase feature) are not used; the API resizes images itself (sharp).
   - **Public vs. private:** public images only in the public `shop-media` bucket. Identity documents, when they exist, need a separate private bucket and short-lived signed URLs (`DATA_AND_SECURITY.md`).
3. **Identity:** Supabase Auth stays behind JWKS verification and the `IdentityAdmin` port (ADR 0005). Replacing it would mean migrating users; that is accepted as the one non-trivial switch.
4. **Maps:** confined to one web module (`lib/maps/openstreetmap.ts` with `osm-location-map.tsx`) and one Flutter widget (`ShopLocationMap`). The database stores coordinates and the owner-confirmed address, never provider data.
5. **Notifications (later):** behind a port, with Firebase Cloud Messaging (free) as the first implementation, when the product-request and review notifications are built (question 53).
6. **Guardrails** (product-owner actions before a hosted environment):
   - moving map tiles to a hosted provider before real traffic (`docs/guides/MAPS.md`);
   - knowing that the Supabase free project pauses after inactivity;
   - a storage usage check before images reach about 80% of the free quota.

## Consequences

- **Benefits:**
  - Development and the first users cost nothing beyond the domain and app-store fees.
  - Each provider swap is configuration plus data copying, not a rewrite.
- **Costs:**
  - Images pass through the API (upload and re-encode). That limits the upload size (5 MB) and uses API memory and CPU, acceptable at onboarding volume. Direct-to-storage uploads with presigned URLs can be added later if needed.
  - Public image URLs point at the storage host; a CDN or custom domain later changes only `STORAGE_PUBLIC_BASE_URL`.
- **Development setup:** the Android emulator reaches local storage through `adb reverse tcp:54321 tcp:54321`, because image URLs use the host's `127.0.0.1`.

## Alternatives considered

- **Supabase Storage SDK (`storage-js`):** simpler, but ties the code to Supabase. Rejected in favour of the S3 protocol.
- **MinIO (or another S3 server) in Docker Compose:** an extra container with no free official image since October 2025. Rejected for local development; the Supabase CLI already provides S3.
- **Direct browser uploads with presigned URLs:** no API bandwidth, but the API could not inspect, re-encode and strip metadata before an image is public. Deferred.
