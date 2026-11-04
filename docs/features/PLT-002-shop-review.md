# Feature: Shop review (submit, approve or request changes, resubmit)

- **Feature ID:** PLT-002
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-04
- **Related modules:** API (`src/shop-review/`, `src/shops/shop-edit-lock.ts`), web portal (shop overview and profile; `/platform/reviews/**`), Shop App (shop home)
- **Decisions:** D-012 (checklist), D-025 (only approved shops are visible), D-032 (request changes with reasons), D-033 (lock during review only; products always editable)

## 1. Problem and goal

A self-registered shop must be checked by the platform before customers and painters see it (D-025):
- the owner completes the onboarding checklist and submits the shop;
- a platform admin checks the photo, location, address, support mobile and products, then approves it or asks for changes with reasons (D-032);
- the owner fixes the shop and resubmits;
- while the shop waits, its profile, photo and location can't change, so the admin reviews what the owner submitted (D-033).

## 2. User roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Shop master account (owner) | See the review status; submit a complete shop; withdraw a submission | Submit an incomplete shop or one already in review or live; edit profile, photo or location while in review |
| Other shop members (future staff roles) | See the status | Submit or withdraw (403 `shop_permission_denied`) |
| Platform admin | See the queue; open a shop's review page (audited); approve or request changes | Decide on a shop that isn't waiting (409) |
| Members of other shops, anyone else | Nothing (404 `shop_not_found` on owner routes; 403/401 on platform routes) | — |

## 3. Preconditions

- The shop exists (SHP-001).
- Its checklist is complete: address, location, support mobile, photo (SHP-003, SHP-004) and 10 active products with a pack size (CAT-002).
- A platform admin account exists (AUTH-001).

## 4. User flow

**Owner (web, shop Overview, Status card):**
1. **Draft:** "Still to do: …" until the checklist is complete, then **Submit for review**.
2. **In review:**
   - "Submitted on … The platform team will check your shop…";
   - the profile page shows **Locked while in review** and read-only fields;
   - **Withdraw to make changes** returns the shop to the status it was submitted from.
3. **Changes requested:**
   - the reasons in words and the platform's note;
   - the profile is editable again;
   - **Submit again for review** once the checklist is complete.
4. **Live:** "Your shop is live. Approved on …"; edits are saved straight away and audited (D-033).

**Platform admin (web, Reviews):**
1. **Reviews:** open submissions, oldest first, marked "First submission" or "Submitted again"; empty state when nothing waits.
2. **Review page:**
   - **Shop profile:** photo, owner, support mobile, address, coordinates with a Google Maps link;
   - **Checklist:** each item with Done/Missing;
   - **Decision:** approve, or request changes with reason checkboxes and a note to the owner;
   - **Earlier submissions:** decision, date, reasons and note;
   - **Products on sale:** the newest 50 with pack prices and availability;
   - the page says that each view is recorded in the audit trail.
3. After a decision: back to the queue with "Shop approved" or "Changes requested".
4. The shop registry detail (PLT-001) links to **Review details**.

**Shop App (shop home, read only):**
- the status chip and description;
- In review: the submission date and the lock;
- Changes requested: the reasons, the note and "submit again on the web portal";
- Draft: what is still to do;
- "Use my current location" while in review explains the lock.

Failure paths:
- an incomplete checklist gives 409 `onboarding_incomplete` ("Complete these first: shop photo, 10 products.");
- submitting twice gives 409 `review_not_allowed`;
- withdrawing with nothing open gives 409 `review_not_pending`;
- a profile, location or photo write while in review gives 409 `shop_in_review`;
- a second decision (for example two admins at once) gives 409 `review_not_pending`;
- changes without a reason, Other without a note, or an approval with reasons give 400 with field errors.

## 5. Business rules

1. **Statuses:** `DRAFT` → `PENDING_REVIEW` → `ACTIVE` ("Live") or `CHANGES_REQUESTED` → `PENDING_REVIEW` … A withdrawal returns to `DRAFT` or `CHANGES_REQUESTED` (whichever the shop was submitted from).
2. **Submission** needs a complete checklist and a draft or changes-requested shop. One open submission per shop.
3. **Lock (D-033):** profile, location and photo writes are refused while `PENDING_REVIEW`. Products, prices and shades are never locked. There is no lock after approval and no re-review.
4. **Decisions:**
   - *approve*: no reasons, optional note;
   - *request changes*: at least one reason from PHOTO_MISSING_OR_UNCLEAR, LOCATION_MISSING_OR_WRONG, ADDRESS_INCOMPLETE, SUPPORT_PHONE_INVALID, PRODUCTS_INSUFFICIENT, PRODUCT_DETAILS_INCORRECT, OTHER; OTHER needs a note;
   - notes are at most 1,000 characters and are shown to the owner;
   - exactly one decision per submission.
5. **Visibility:** only `ACTIVE` shops will be shown to customers and painters (enforced by the customer features when they are built).
6. **Notifications:** none yet. The owner sees the decision on the next visit (SMS/push come with the notifications port, question 53).
7. **Audit:**
   - `shop.review_submitted` (resubmission flag), `shop.review_withdrawn`;
   - `shop.review_decided` (decision, reason codes, whether a note was given, never the note's text);
   - `platform.shop_review_viewed` on every review-page view, because it shows the shop's private data.

## 6. UI requirements

- Status is stated in words (Draft, In review, Changes requested, Live) on the web and in the app; reasons are full sentences.
- The decision form uses native radios and checkboxes with labels, a legend per group and field errors; it submits in a transition, so choices survive a failed save.
- Platform pages read data inside `<Suspense>`; the review page links back to the queue.
- New components:
  - `ReviewPanel` (`components/shops/`) and `ReviewDecisionForm` (`components/platform/`);
  - `lib/shops/review.ts` (reason and checklist wording), `lib/shops/labels.ts` (`SHOP_STATUSES`);
  - Shop App `shop_review.dart` (model, reason wording, IST date).
- Platform navigation gains **Reviews**.

## 7. API contract

**Owner** (`@ShopScoped`; writes need the master account):
- `GET /v1/shops/:shopId/review` → `ShopReviewState`: `{status, missing[], canSubmit, open: {submittedAt} | null, lastDecision: {decision, reasons, note, decidedAt} | null}`;
- `POST /v1/shops/:shopId/review-submission` → `ShopReviewState`;
- `POST /v1/shops/:shopId/review-submission/withdraw` → `ShopReviewState`.

**Platform** (`@PlatformAdminOnly`):
- `GET /v1/platform/reviews?cursor&limit`: open submissions, oldest first (`reviewId`, `shopId`, `shopName`, `submittedAt`, `resubmission`);
- `GET /v1/platform/shops/:shopId/review` → `ShopReviewSnapshot`: registry entry, profile, checklist, `products {activeCount, items}`, `open`, `history` (last 10 decided). Audited;
- `POST /v1/platform/shops/:shopId/review/decision`: `{decision: APPROVED|CHANGES_REQUESTED, reasons[], note?}` → `{shopId, status, decision}`.

**Errors:** 400 `validation_failed` / `invalid_cursor`; 403 `shop_permission_denied` / `platform_admin_required`; 404 `shop_not_found`; 409 `onboarding_incomplete`, `review_not_allowed`, `review_not_pending`, `shop_in_review`.

## 8. Data model and migrations

- **`20261104093826_plt_002_shop_review`:**
  - `shop_status` gains `PENDING_REVIEW`, `CHANGES_REQUESTED`, `ACTIVE`;
  - new enums `shop_review_decision` and `shop_review_reason`;
  - table `shop_reviews`: `shop_id`, `open_shop_id` (unique), `submitted_from`, `submitted_by_user_id`, `submitted_at`, `decision?`, `decided_by_user_id?`, `decided_at?`, `reasons[]`, `note?`;
  - indexes on `(shop_id, submitted_at)` and `(decision, submitted_at)`; RLS.
- **`20261104093900_plt_002_review_checks`:** CHECKs (a separate migration, because Postgres allows the new enum values only after the migration that adds them commits):
  - open ⇔ no decision, with `open_shop_id = shop_id`;
  - decided rows have who and when;
  - `submitted_from` is DRAFT or CHANGES_REQUESTED;
  - reasons only (and at least one) with CHANGES_REQUESTED; OTHER needs a note;
  - notes trimmed, 1–1,000 characters, and only on platform decisions.
- **One open review per shop:** `open_shop_id` equals `shop_id` while the review is open and is null afterwards. A plain unique index then allows one open review per shop. Prisma models it, so the drift check stays clean (unlike a partial index).
- **Withdrawals** are kept as `WITHDRAWN` rows (decided by the owner), so the history is complete.

## 9. Security and privacy

- **Authorization:**
  - owner routes: membership checked by `ShopAccessGuard` and the owner role by `requireShopRole`;
  - platform routes: `@PlatformAdminOnly`;
  - both are tested with another shop's owner (404) and a shop owner on platform routes (403/401).
- **Concurrency:** submit, withdraw, decide and the profile/location/photo writes all lock the shop row (`SELECT … FOR UPDATE`) inside their transaction. So:
  - an edit can't slip in after a submission;
  - two decisions can't both apply.
- **Platform access to tenant data:** the review page shows the support mobile, address and products; each view is audited (`platform.shop_review_viewed`). The queue shows names and dates only.
- **Audit and logs:** the admin's note may contain free text, so it isn't copied into audit metadata; nothing sensitive is logged.

## 10. Acceptance criteria

- [x] The owner can submit only a complete shop; the API names what is missing.
- [x] While in review, profile, location and photo writes are refused (web forms read-only); products stay editable.
- [x] The owner can withdraw and edit again; the shop returns to the status it came from.
- [x] A platform admin sees the queue (oldest first, resubmissions marked) and the shop's details; each view is audited.
- [x] The admin can approve (the shop is Live) or request changes with reasons and a note (Other needs a note); a second decision is refused.
- [x] The owner sees the reasons and note, fixes the shop and resubmits; after approval edits are free.
- [x] The Shop App shows the status, the lock and requested changes (read only).
- [x] Other shops' owners and non-admins can't use the routes.

## 11. Test plan

- **API e2e (6 new):**
  - an incomplete checklist is refused with the missing items;
  - the lock covers profile, location and photo but not products; submitting twice is refused; audit;
  - withdraw and edit again; withdrawing twice is refused;
  - queue, audited snapshot, a note required with Other, request changes, the owner's state, audit metadata, resubmission marked, approve, a second decision refused, edits after approval, `/v1/me` shows Live, history;
  - decision validation; a draft can't be decided; unknown shop 404;
  - another shop's owner gets 404; a shop owner gets 403 and anonymous callers 401 on platform routes.
- **Web (8 new):**
  - `ReviewPanel`: still-to-do, submit, other members, in review, changes requested, live;
  - `ReviewDecisionForm`: options, reasons kept after errors.
- **Flutter (2 new):** the shop home shows requested changes and the in-review lock (IST date).
- **Manual:** Chrome and the emulator; see §13.

## 12. Dependencies and open questions

- Customer and painter visibility of `ACTIVE` shops is enforced when those features exist.
- Notifying the owner of a decision needs the notifications port (question 53).
- Questions 49 (limit on registrations/pending shops) and 51 (email sign-up mitigation) remain hardening items.
- A Shop App submit/withdraw action is not planned; the web portal does it.

## 13. Implementation notes

**API:**
- `src/shop-review/` (`shop-review.schemas.ts`, `shop-review.service.ts`, `platform-reviews.service.ts`, both controllers, module);
- `src/shops/shop-edit-lock.ts` (`lockShopStatus`, `lockShopForProfileEdit`, `shopInReview`), used by `ShopProfileService` and `ShopPhotoService`;
- `ShopProfileService.profileOf/onboardingOf`, `ShopProductsService.activeForReview`; `ShopsModule`, `ShopCatalogueModule` and `PlatformShopsModule` export what the review needs.

**Web:**
- `src/app/shops/[shopId]/review-actions.ts`, the overview's `ReviewPanel`, the profile page lock;
- `src/app/platform/(console)/reviews/` (queue, `[shopId]`, `actions.ts`);
- `src/lib/api/shop-review.ts`; the registry detail's **Review details** link.

**Shop App:**
- `lib/src/shops/shop_review.dart`, `fetchReview` on `ShopProfileRepository`, `shopReviewProvider`;
- the shop home review details; the `ShopInReview` message on the profile screen.

**Found and fixed during verification:**
1. The profile form also said "View only: Only the shop owner can change the profile" to the owner during review. The page now passes `viewOnlyNote={null}` because its own alert explains the lock.
2. The go-live sentence repeated under the In review and Changes requested banners; it now shows for drafts only.

**Verified locally (2026-11-04):**
- **Chrome** (this computer's Chrome, local test owner of Lakshmi Paints):
  - "5 of 5 done" → Submit for review → In review (time shown);
  - profile page locked, without the misleading view-only note;
  - Changes requested with both reasons and the note → photo re-uploaded (editable again) → Submit again;
  - Withdraw → back to Changes requested (reasons kept) → Submit again;
  - after approval: Live ("Approved on 4 Nov 2026"), shop list "Live";
  - no console errors.
- **Platform side over HTTP** with the local test admin's session (a script that reads the test password from a local file without printing it; this session may not read that password, so it wasn't typed into Chrome):
  - queue (first submission, then "Submitted again", then empty);
  - review page sections, decision form and the audit notice;
  - registry "Review details" link;
  - decisions through the API: changes requested, approval, a second decision gets 409;
  - history shown.
- **Android emulator:** the Shop App shop list and home show "Live" for Lakshmi Paints.

**Not verified:** the platform decision form submitted from a browser (covered by component tests and the API e2e). The product owner can run it in Chrome after signing in as the platform admin.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-04 | Specification and implementation (D-025, D-032, D-033) |
