# Feature: Public home page

- **Feature ID:** WEB-001
- **Status:** Complete (local verification; see §7). Copy awaiting product-owner review.
- **Last updated:** 2026-11-05
- **Related modules:** `apps/admin_web` (`src/app/page.tsx`, `src/components/marketing`, `src/components/ui/store-button.tsx`, `src/lib/app-stores.ts`)
- **Decisions:** D-024/D-025 (self-registration and review: the "How a shop goes live" steps), D-037 (browse any Live shop), D-010 (credit per shop), D-039 (shared components)

## 1. Problem and goal

`/` was a bare "choose how to sign in" page listing **Shop owners and staff** and **Platform admin**. The product owner (2026-11-05) asked for a product website first, in the style of a product launch page (reference: Shopify's "Introducing Shop" page): explain what the platform is, its vision and mission, everything it provides, then **Login** and **Register**. Shops should not see the platform admin entry; platform admins open `/platform/sign-in` directly.

This is the first of a UI/UX pass before Phase 2. Next: WEB-002 (sign-in and registration UX).

## 2. Users

| Visitor | Sees |
|---|---|
| Anyone (not signed in) | The home page. Login and Register both open `/sign-in` (the OTP flow creates the account; WEB-002 will give Register its own mode). |
| Platform admin | Nothing on the page; types `/platform/sign-in`. Server-side authorization is unchanged: hiding the link is not a security control. |

## 3. Page

1. Sticky header: product name, section links (desktop only), Login and Register your shop ("Register" on phones).
2. Hero: what the platform is, Register / Login, an illustration.
3. Why: today (calls, WhatsApp, notebooks) and what the platform does instead.
4. Vision and mission (**drafts**, below).
5. What we provide: Customer App (**Coming soon**), Shop App (**Coming soon to stores**), Shop Admin portal (**Available now**), each with four points.
6. For painters and contractors (**Coming soon**): sites, spending per site, separate shop bills, credit decided by each shop.
7. How a shop goes live: register → profile, photo, 10 products → review → live.
8. Your shop's data stays yours.
9. Get the apps: App Store and Google Play buttons for both apps, shown as "Coming soon to …" and not clickable while the apps are unpublished.
10. Questions (FAQ, `details` cards), closing call to action, footer.

**Copy rules:** only facts from the product documents; planned features are labelled; no prices, numbers, testimonials or pricing plans. All copy is in `src/components/marketing/home-content.ts`.

**Drafts for review (product owner):**
- Vision: "Every independent paint shop can serve its painters and customers digitally, without building an app of its own."
- Mission: "Give paint shops, painters and customers one dependable system for catalogues, orders, site spending, bills and credit, while every shop's business stays its own."
- Hero: "Your paint shop online. Your painters and customers in one place."

## 4. Store links

`src/lib/app-stores.ts` holds the App Store and Google Play URLs of both apps, all `null` today (the app IDs are still placeholders, question 41). Setting a URL turns that button into a link (new tab, `noopener`). The URLs are not in `brand.json` because brand values must be non-empty strings.

## 5. Design

- Only design tokens and `components/ui`; new `StoreButton` component (link with a URL, otherwise `aria-disabled` "Coming soon"). `BrandMark` gained `name="product"`.
- Illustrations are inline SVG drawn with token classes (no literal colours, no external images). **They are placeholders:** the product owner asked to replace them with real app screenshots and add more content later.
- The page stays `noindex` (root layout) until the product name is decided and the site goes live.

## 5a. Experience (product owner: "make it more premium", 2026-11-05)

- **Scrolling:** smooth scrolling to sections (`scroll-padding-top` for the sticky header); a thin brand progress bar under the header; the header is translucent with a blur and gains a soft shadow once the page scrolls; section headings and cards fade up as they enter the screen, staggered.
- **Navigation:** the desktop header highlights the section being read (IntersectionObserver, `section-nav.tsx`); phones get a menu (`details` disclosure) with the section links and Login, closing when a link is chosen.
- **Polish:** larger hero headline (new `typography.hero` token, 52 px, desktop only), soft colour wash and gently floating illustration, hero highlights with icons, cards that lift on hover, a brand-gradient closing panel. A temporary mark (sparkle tile) sits beside the name until the logo exists.
- **Icons:** `components/ui/icon.tsx` (`Icon`, `IconTile`): own line icons; App Store and Google Play glyphs from Font Awesome Free (CC BY 4.0, credited in the file). Switch to the stores' official badges at publication.
- **Safety:** all motion is CSS (`globals.css`: `.reveal`, `.scroll-progress`, `.header-elevate`, `.float-slow`) inside `prefers-reduced-motion: no-preference` and `@supports (animation-timeline: view())`, so content is never hidden in browsers without scroll-driven animations or without JavaScript, and nothing moves for people who ask for reduced motion.

## 5b. Footer and company (product owner, 2026-11-05)

- The platform is a product of **zero.byt** (`BRAND.companyName`, `BRAND.companyHandle` "@zero.byt" in `brand.json`). The footer shows a "Powered by zero.byt · @zero.byt" strip, as on the brand poster, and "A product of zero.byt."
- Dark teal footer with columns Product (page sections), Company (About us, Contact us), Legal (Privacy policy, Terms of use) and round WhatsApp, Instagram and LinkedIn buttons.
- **Placeholders:** none of these pages or accounts exist yet; they are added after the product name is confirmed. Each shows as a disabled link (`aria-disabled`, "coming soon" for screen readers). URLs live in `src/lib/site-links.ts`; setting one switches that link on.

## 6. Tests

- `src/app/page.test.tsx`: one `h1`; the three products; vision and mission; header Login/Register go to `/sign-in`; no link to `/platform/*` and no "platform admin" text; four store buttons disabled with "coming soon".
- `ui.test.tsx`: `StoreButton` as a link and as a disabled placeholder. `brand-mark.test.tsx`: product name.

## 7. Checks (2026-11-05)

| Check | Result |
|---|---|
| `pnpm format:check`, admin_web lint, typecheck | Passed |
| admin_web tests (155) | Passed |
| `pnpm ui:check`, `pnpm tokens:check` | Passed |
| admin_web build | Passed |
| Headless Chrome screenshots at 1280 px and 518 px (the narrowest headless width); header gap and badge width fixed after the first look | Verified |
| `/platform/sign-in` still opens by URL (HTTP 200) | Verified |
| Scroll check in headless Chrome over CDP (1280×900, scrolled to 3400 px): header shadow on, progress bar 61 %, "How it works" highlighted, all on-screen cards opacity 1; with reduced motion: no shadow/progress animation, content visible | Verified |
| Phone header at 518 px: Register + menu (Login moved into the menu) | Verified |
| Interactive check in the product owner's Chrome | **Not run** (Claude in Chrome was not connected) |
| Flutter format, analyze, `flutter_shared` tests (new `AppTypography.hero` generated) | See PROJECT_STATE |

## 8. Limitations and next

- Copy drafts need product-owner approval; the product name is still the working name.
- Store buttons stay disabled until the apps are published.
- Replace illustrations with screenshots (product owner request).
- WEB-002: separate Login and Register entry, improved OTP screens, then the register-shop and My shops screens.
