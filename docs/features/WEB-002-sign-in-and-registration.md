# Feature: Sign-in and registration UX

- **Feature ID:** WEB-002
- **Status:** Complete (local verification; see §6)
- **Last updated:** 2026-11-06
- **Related modules:** `apps/admin_web`: `app/sign-in`, `app/register`, `app/shops/new/page.tsx`, `components/auth`, `components/ui/field.tsx` (prefix), `components/ui/button.tsx` (tertiary, ref), `lib/auth/otp.ts`
- **Decisions:** D-024 (shops self-register; the account is created on first verification), D-039 (shared components), DESIGN_SYSTEM §9a (wording)

## 1. Problem and goal

After WEB-001 the home page offered **Sign in** and **Register your shop**, but both opened the same plain `/sign-in` card. Its copy told new people to "sign in to create an account". After verification everyone landed on `/shops`, so a new owner had to find "Register a shop" themselves. The product owner asked for a better UI and UX for sign-in and registration in the home page's premium style.

## 2. Flow

| Entry | Steps | After the code is verified |
|---|---|---|
| `/sign-in` "Sign in to your shop" | Mobile number → code | `/shops` (no shops yet: "Register a shop" there) |
| `/register` "Register your shop" | Step 1 Verify mobile → step 2 Shop details | `/shops/new` "Tell us about your shop" (step 2) |

- Both entries use the same Server Action (`otpSignIn`) and the same Supabase calls as before.
- A hidden `mode` field (`sign-in` | `register`) is parsed by `parseAuthMode` (anything else counts as `sign-in`) and mapped by `afterVerifyPath` to a **fixed** path. The redirect never uses a URL from the form.
- Already signed in: `/sign-in` goes to `/shops` and `/register` goes to `/shops/new` (`RedirectIfSignedIn`, rendered in `Suspense` so the pages stay partly prerendered). This is a convenience only: `/shops` is still guarded by `proxy.ts` and the shop pages and API authorize every request.
- Each page links to the other ("New here? Register your shop" / "Already registered? Sign in"). The home page's Register buttons go to `/register`.

## 3. Screens

- `AuthLayout`:
  - **Desktop:** a dark teal brand panel with the product name (a link home), the promise headline, three highlights with icons and "Powered by zero.byt" (logo PNG), beside the form card.
  - **Phones:** a compact teal bar above the form.
- `AuthSteps`: 1 Verify mobile → 2 Shop details, with `aria-current="step"` and "Step n of 2" for screen readers.
- Mobile step: `Field` with a fixed **+91** prefix (linked through `aria-describedby`).
- Code step:
  - **Code field:** large, spaced and numeric. It **submits itself on the sixth digit** (typed or pasted; `requestSubmit` through the Verify button), and the button stays.
  - **Verify button:** reads "Sign in" or "Verify and continue" (register).
  - **Change number:** a quiet tertiary action.
  - **Resend code:** disabled for **60 s** ("Resend code in 0:42"), matching the API's "Wait a minute" rate-limit message. The step remounts for each new code, which restarts the countdown.
- Errors stay next to the field; loading labels ("Sending code…", "Checking…") are unchanged.

## 4. Components added (D-039)

- `Field` `prefix`.
- `Button` `tertiary` variant (existing `buttonTertiary` tokens) and a `ref` prop.
- `Icon` `check`.
- `components/auth`: `AuthLayout`, `AuthSteps`, `RedirectIfSignedIn`.

## 5. Tests

- `lib/auth/otp.test.ts`: `parseAuthMode` (including a URL value → `sign-in`) and `afterVerifyPath`.
- `otp-sign-in-form.test.tsx` (7):
  - the mode is sent and the register wording is shown;
  - the +91 prefix;
  - the sixth digit submits the code;
  - code errors appear;
  - resend is disabled during the countdown and enabled after it (fake timers);
  - "Change number" works.
- `ui.test.tsx`: `Field` prefix, tertiary button. `components/auth/auth.test.tsx`: one `h1`, the link home, the zero.byt logo, step states.
- `page.test.tsx`: every Register button goes to `/register`.

## 6. Checks (2026-11-06)

| Check | Result |
|---|---|
| `pnpm format:check`, admin_web lint, typecheck | Passed |
| admin_web tests (172) | Passed |
| `pnpm ui:check`, `pnpm tokens:check` | Passed |
| admin_web build (`/sign-in`, `/register` partly prerendered) | Passed |
| Real flow in headless Chrome over CDP against the local API and Supabase (test numbers, code 123456), 1280 px: register → code submitted itself → `/shops/new` with step 2; signed in `/sign-in` → `/shops`, `/register` → `/shops/new`; signed out wrong code → error next to the field; sign in → `/shops`; countdown "Resend code in 0:58" | Verified |
| Phone width 518 px: compact brand bar, steps, +91 field | Verified (layout); the code step is covered at 1280 px |
| Flutter | Not affected |

## 7. Limitations and next

- The platform admin sign-in (`/platform/sign-in`) keeps its own page.
- Resending twice within the same session shows the same notice, so the countdown does not restart a second time. The server's rate limit still applies.
- Next: the product owner chose a new name and logo (DS-003 rebrand), and the My shops screen gets the same treatment.
