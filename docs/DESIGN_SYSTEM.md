# Design System

**Status:** Provisional visual foundation — review before detailed screen design  
**Last updated:** 2026-11-04

The product should feel clear, dependable and practical for local paint shops, painters and customers. Avoid a generic admin-template appearance. Prioritize product information, readable prices, clear shop context and simple actions. Product name SevenPalette with the shade-card fan logo (D-040, DS-003).

## 1. Visual direction

- Light theme first; white and very light neutral surfaces.
- Deep teal as the primary brand family (poster palette, 2026-11-05).
- Sunflower yellow as a limited accent; coral for small decorative marks; warm cream backgrounds.
- Clear typography and controlled spacing.
- Rounded cards and inputs, but avoid excessive pills and decorative containers.
- Use color to communicate meaning, not decoration.
- Product imagery and shade information should be prominent.

Values below are initial tokens, not final brand approval. **Source of truth:** `packages/design_tokens/tokens.json` (and `brand.json` for product/app names), since DS-001. The tables here describe the tokens; if they ever differ, `tokens.json` wins. Change a token there, run `pnpm tokens:generate`, then update this document. Rebranding steps (colours, font, logo, names): `packages/design_tokens/README.md`.

## 2. Colour tokens

Palette from the product owner's brand poster (2026-11-05, trial: kept or reverted after review): deep teal, sunflower yellow, coral and warm cream. Was navy `#1F4B7A` and amber `#F5B544`.

| Token | Hex | Use |
|---|---|---|
| `brand.primary` | `#0F6B66` (deep teal) | Main actions, selected navigation, links |
| `brand.primaryStrong` | `#0B4F4B` | Pressed/strong primary states |
| `brand.primarySoft` | `#E3F2EF` | Selected backgrounds/highlights |
| `brand.accent` | `#F7C344` (sunflower) | Limited highlights and offers; also headline text on `brand.primaryStrong` |
| `brand.highlight` | `#F25C3B` (coral) | Decorative marks only (underlines, dots, small shapes); never text |
| `logo.tealMid`, `logo.tealLight`, `logo.orange`, `logo.mint`, `logo.mist` | `#3E8C86`, `#7FB8B2`, `#F59A3F`, `#A9D3CE`, `#CFE3DF` | Strips of the SevenPalette fan logo only (DS-003); never text or UI |
| `surface.default` | `#FFFFFF` | Main surfaces |
| `surface.subtle` | `#FAF6EE` (warm cream) | Page backgrounds/secondary sections |
| `surface.raised` | `#FFFFFF` | Cards/dialogs |
| `text.primary` | `#132A29` | Main text |
| `text.secondary` | `#566A68` | Supporting text |
| `text.disabled` | `#9AA8A6` | Disabled text |
| `border.default` | `#ECE5D8` | Borders/dividers |
| `border.strong` | `#D3CBBB` | Emphasized borders |
| `status.success` | `#15803D` | Success |
| `status.warning` | `#B45309` | Warning |
| `status.error` | `#B42318` | Error/destructive |
| `status.info` | `#2563EB` | Informational |

The generator fails if a text/background pair listed in `tokens.json` (`contrastPairs`) is below WCAG AA (4.5:1).

Rules: use one primary action per screen; use accent yellow sparingly and dark text on it; never use color alone for status; verify contrast to WCAG AA; paint shade colors are catalogue data, not app brand tokens.

## 3. Typography

**Proposed font:** Inter across web and mobile. Bundle/localize font assets for Flutter and use a build-time font strategy for Next.js.

| Token | Size | Weight | Use |
|---|---:|---:|---|
| `hero` | 52 px | 700 | Public website headline only (desktop) |
| `display` | 32 px | 700 | Rare hero/summary |
| `heading1` | 28 px | 700 | Main page heading |
| `heading2` | 24 px | 600/700 | Section/page title |
| `heading3` | 20 px | 600 | Card/subsection title |
| `title` | 18 px | 600 | Product/list title |
| `bodyLarge` | 16 px | 400/500 | Main body |
| `body` | 14 px | 400/500 | Supporting body |
| `caption` | 12 px | 400/500 | Helper text/metadata |

Body text should normally be at least 14 px. Use tabular numerals for prices/totals where supported. Avoid too many weights on one screen.

## 4. Spacing scale

Use a 4 px base scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- Standard mobile side padding: 16 px; 20–24 px on larger phones.
- Content widths (web utilities and Flutter `AppLayout`): `form` 448 px (sign-in and short forms), `narrow` 576 px, `content` 768 px, `page` 1152 px, `sidebar` 256 px. Tailwind's default container sizes are reset, so only these exist.
- Keep related controls close; use larger spacing between sections.
- Avoid arbitrary one-off spacing values unless necessary.
- Centralize tokens in Flutter and web.

## 5. Shape and elevation

| Token | Value | Use |
|---|---:|---|
| `radius.small` | 8 px | Compact surfaces |
| `radius.medium` | 12 px | Buttons and controls |
| `radius.large` | 16 px | Cards and sheets |
| `radius.xlarge` | 20 px | Large panels |
| `radius.pill` | 999 px | Chips/status pills only |

Prefer subtle borders over heavy shadows. Do not wrap every content section in a card.

## 6. Controls and interaction

- Minimum mobile touch target: 48 × 48 logical pixels where practical.
- Buttons need action-oriented labels.
- Inputs need labels, helper text, validation, disabled and loading states.
- **Status colours (CAT-003):** badges are filled with a soft tone (`status.*Soft`) plus a dot and text in the tone colour. Success = green (Available, Live), warning = amber (Not available, Changes requested), info = blue (In review, Own product), error = red, neutral = grey (Draft). Opposite states never share a colour, and the words always say the state. Orders (ORD-002): New blue, Packing amber, Ready for pickup / Out for delivery green, Completed grey, Cancelled red (`Badge` tone `error`).
- **Lists:** web lists that can grow use `DataTable` with pagination and column filters; the mobile apps use search, a filter sheet and "Load more" instead of tables.
- **Required fields (DS-004, product owner 2026-11-06):** every required field shows a red asterisk after its label (`status.error`), and the control tells screen readers it is required (web `aria-required`; Flutter a spoken ", required"). Pass `required` to `Field`, `SelectField`, `TextareaField`, `FileField` and the choice groups, or `isRequired` to `AppTextField`, `AppDropdown` and `AppRadioGroup`.
  - A form with more than one field explains the marker once, above the fields: `RequiredFieldsNote` ("Fields marked * are required.").
  - Mark a field only when the server rejects the form without it. A field that is needed only in some cases (for example the extra pack rows of a new product) is not marked.
  - On the shop profile the marker means "needed before the shop can be submitted for review"; the note says so, because the profile can be saved part-filled.
  - Optional fields keep "(optional)" in the label. The browser's own required pop-ups are not used; the server's messages show next to the field.
- Confirm destructive actions involving data loss or financial changes.
- Include loading, empty, error and success states for data-driven screens.
- Do not rely only on toast messages for important financial/order updates.

## 7. Responsive web rules

Proposed breakpoints: compact below 600 px; medium 600–899 px; desktop 900–1199 px; wide desktop 1200 px and above.

- Every new screen supports desktop, tablet and phone from the start, including tables, navigation and dialogs (D-042).
- Mobile web uses compact navigation.
- Desktop admin may use a persistent sidebar.
- Tables must remain usable on narrow screens (responsive cards or controlled horizontal scroll).
- Forms should not stretch across an entire wide monitor.
- Keep content widths readable.

## 8. Components (D-039, DS-002)

**Rule:** screens use only the project's own components:
- web: `apps/admin_web/src/components/ui`;
- Flutter: `packages/flutter_shared/lib/src/components`.

Screens never style raw controls (buttons, inputs, dropdowns, switches, cards, dialogs, sheets, snack bars, spinners, network images) or use base radii and literal colours. To change how every button, field, sheet or dialog looks, change its **component token** in `packages/design_tokens/tokens.json` and run `pnpm tokens:generate`; nothing in the screens changes.

A new kind of control is added as a component first (here and in the code), then used. Components are built when a screen needs them, not in advance. `pnpm ui:check` (CI) lists any raw control in a screen with the component to use instead.

### Component tokens (`tokens.json` → `component`)

Each property names a base token: `radius` a radius token, `minHeight` a layout token, every other property a colour token. Raw values are rejected, and foreground/background pairs must meet WCAG AA.

| Component token | Used by | Today |
|---|---|---|
| `control` | text fields, dropdowns, search (buttons share its height) | radius `medium`, minimum height `minTouchTarget`, border `border.strong`, error border `status.error` |
| `button` | every button on the web and in Flutter | radius `pill`: fully rounded (product owner, 2026-11-05) |
| `card` | cards, list panels, sections, empty states | radius `large`, border `border.default` |
| `panel` | boxes inside a card (pack, shade, review rows) | radius `medium`, border `border.default` |
| `inlineMessage` | web `Alert`, Flutter `AppInlineMessage` | radius `medium` |
| `sheet`, `dialog`, `snackbar` | overlays | radius `xlarge`, `large`, `medium`; the snack bar is dark (`text.primary`) |
| `badge` | status badges | radius `pill` |
| `image`, `swatch`, `navItem` | photos, shade swatches, sidebar links | radius `medium`, `small`, `small` |
| `buttonPrimary`, `buttonSecondary`, `buttonTertiary`, `buttonDestructive` | button variants | background, hover, foreground (and border) |

Web utilities: `rounded-control`, `min-h-control`, `rounded-card`, `border-card-border`, `bg-button-primary-background` and so on. Flutter: `AppComponentTokens.controlRadius`, `cardBorder`, `buttonPrimaryBackground` and so on.

### Web components (`components/ui`)

| Component | Use |
|---|---|
| `Button`, `SubmitButton`, `ButtonLink` | actions (primary, secondary, tertiary for quiet text actions such as "Change number"); pending state |
| `Field` (optional `prefix`, e.g. "+91", and decorative `leadingIcon`, e.g. `search`), `SelectField`, `TextareaField`, `FileField` | labelled inputs with helper text and errors linked through `aria-describedby`; file errors are announced |
| `CheckboxField`, `CheckboxGroupField`, `RadioGroupField` | single checkbox; groups with a legend, hint and error |
| `SearchForm` | GET search with a labelled field, optional filters and hidden values |
| `Card`, `CardList`, `CardLink` (`variant`: `default`, `raised` lifts on hover, `dashed` for an "add another" tile), `Panel` (`cardClasses` where an element can't be a component) | surfaces |
| `Alert`, `Badge`, `StateMessage` (optional `icon` tile), `Spinner`, `PageHeader` (optional `eyebrow` caption and `back` link) | messages, status, empty states, loading, page titles |
| `DataTable` (`Column`: header, cell, `filter`, `align`, `width`, `sorted`, `cellClassName`; stacks into cards below `desktop`), `SortHeader`, `ColumnSelectFilter`, `ColumnSearchFilter`, `FilterForm`, `Pagination` (CAT-003) | data lists that can grow: per-column filters in the URL, sorting, pages and rows per page |
| `Menu` (`MenuLink`, `MenuButton`, `MenuSeparator`, `MenuLabel`), `ConfirmDialog`, `IconButton`, `Button` `destructive` (WEB-005) | dropdown and row action menus, confirming destructive actions, icon-only buttons |
| `Thumbnail`, `PackChip` (CAT-006) | product photos in lists (with a placeholder), pack size with price and availability dot; lists show one row per thing, details as chips |
| `SideSheet`, `SideSheetButton`, `useSideSheet`, `useCloseSheetOnSave`, `Toast` (WEB-007, D-051) | small add and edit forms in a panel from the right over a blurred page (native modal dialog: Escape, outside click and Close shut it; the draft survives closing); after a save the sheet closes, the form clears and a toast confirms, with an optional link. Records with their own lists or many sections stay full pages |
| `StatTile` (WEB-008) | one headline number: label, value in text colours, optional context, status badge (word + tone) and link to the list behind it; KPI rows are 2 per row on phones, 4 from `wide` |
| `Section`, `DetailList` (UX-001) | every titled card on a page: one padding (`p-5 medium:p-6` main, `p-5` side) and heading (`heading3` main, `title` side), `aria-labelledby` built in; facts as label/value pairs in one style |
| `Skeleton`, `TableSkeleton`, `DetailSkeleton`, `TilesSkeleton`, `LinesSkeleton` (UX-001) | loading placeholders shaped like the content (no layout jump); pulse only with motion allowed; one screen-reader label |
| `SectionBoundary` (UX-001) | wraps a data section: if it fails, only that section shows "We couldn’t load …" with Try again (refreshes server data); redirects and not-found pass through |
| `ConfirmActionButton` (UX-001) | remove/archive and other hard-to-undo actions: asks in `ConfirmDialog`, then reports with a page toast |
| `StateMessage variant="plain"` (UX-001) | empty states inside a card or table (no second border) |
| `Combobox` (CAT-005) | search with suggestions and a "create new" option, ARIA combobox |
| `SegmentedLinks` | switching a list between views (e.g. Selling and Archived), links with `aria-current`; scrolls sideways inside itself when the segments don't fit |
| `Button` size `compact` (ORD-002) | a quiet action inside a table row (e.g. the order's next step); everywhere else the default size |
| `showToast` / `ToastHost` (ORD-002) | a page-level toast for actions whose own component may disappear after the change (a row leaving the current tab) |
| `AppShell` (`area` with caption, name and switch link; icon `nav`), `NavLinks` (`vertical`, `horizontal`, `tabs`; optional `icon`), `PageLoading` (placeholder skeleton) | console frame, navigation, page loading |
| `Icon`, `IconTile` | the project's icon set (line icons, `currentColor`; store glyphs); a new icon is added here first (WEB-001) |
| `AuthLayout`, `AuthSteps` (`components/auth`) | sign-in and registration frame and the 2-step indicator (WEB-002) |
| `StoreButton` | App Store / Google Play button; a link when the store URL exists, otherwise a disabled "Coming soon" (WEB-001) |

**Motion (public site only):** CSS scroll-driven reveal, header elevation and progress bar in `globals.css`, always inside `prefers-reduced-motion: no-preference` and `@supports`; content is never hidden without them. Console screens stay static, except the side sheet and toast sliding in (WEB-007), also only with `prefers-reduced-motion: no-preference`. The public home page builds its sections from these components in `components/marketing` (illustrations are inline SVG with token classes only). Overlays on the web are `ConfirmDialog`, `SideSheet` and `Toast`; the side sheet uses the `sheet` component tokens.

### Flutter components (`flutter_shared`)

| Component | Replaces |
|---|---|
| `AppButton` (`primary`, `secondary`, `tertiary`, `destructive`; `icon`, `loading`, `expand`) | `FilledButton`, `OutlinedButton`, `TextButton` |
| `AppTextField`, `AppSearchField`, `AppDropdown<T>` (with `AppOption<T>`) | `TextField`, dropdowns |
| `AppSwitchRow`, `AppCheckboxRow`, `AppRadioGroup<T>`, `AppSegmentedControl<T>` | switches, checkboxes, radios, segmented buttons |
| `AppCard` (`tone`, `onTap`), `AppSection`, `AppNavRow` | `Card`, `ListTile` |
| `AppBadge`, `AppInlineMessage` (`AppTone`), `showAppSnackBar` | chips, hand-styled status text, snack bars |
| `showAppBottomSheet`, `showAppDialog`, `showAppConfirmDialog` | `showModalBottomSheet`, `showDialog`/`AlertDialog` |
| `AppSpinner`, `AppNetworkImage` | `CircularProgressIndicator`, `Image.network` |

`LoadingView`, `MessageView`, `ErrorView`, `BrandMark` and `ShopLocationMap` are built from these. `AppTheme.light()` reads the same component tokens, so Material widgets used inside the components match.

Prefer small composable components. Avoid universal components with dozens of unrelated flags. Extract domain components (product or shop cards) when their behaviour is stable and reused.

## 9. Paint-specific UI

- Always make the selected shop visible in customer shopping context.
- Clearly label products from other shops in cross-shop results.
- Display brand, pack size, price and shade information in a scannable order.
- Do not use a generic colored circle as a substitute for an actual shade catalogue.
- Show shade name/code as text as well as a visual preview.
- Painter-only incentives must be distinct from public selling price and hidden from normal customers.
- Bills should separate subtotal, discount, tax (if applicable), payments and outstanding amount.

## 9a. Writing and capitalisation (product owner, 2026-11-05)

Every piece of text in the web portal, both apps, emails and store listings follows these rules. Check them in every review.

| Kind of text | Rule | Examples |
|---|---|---|
| Headings, buttons, labels, menu items, badges, tabs, messages | **Sentence case**: capitalise the first word and proper nouns only | "Add pack size", "Your shop's data stays yours", "Coming soon" |
| Section labels shown in capitals | Write them in sentence case; capitals come from CSS (`uppercase`) only | source "How it works", shown as HOW IT WORKS |
| Our apps and areas (proper nouns) | **Title case**, always the same words | Customer App, Shop App, Shop Admin Portal, Platform Admin, My Shops |
| Account actions | "Sign in", "Sign out", "Register" (verbs); never "Login" or "Log in" as a button | "Sign in with your mobile" |
| Product | **SevenPalette**: one word, capital S and P; app names SevenPalette, SevenPalette Shop, SevenPalette Admin (D-040) | "SevenPalette gives independent paint shops…" |
| Company | **zero.byt** always lower case, even at the start of a sentence; handle **@zero.byt** | "Powered by zero.byt" |
| Other brands and platforms | Their own spelling | WhatsApp, Instagram, LinkedIn, App Store, Google Play, Google Maps, Android, iPhone |
| Abbreviations | Capitals | OTP, MRP, GST, PNG, CSV, ID |
| Money and quantities | Rupee sign and Indian grouping; a space before units | ₹1,240 · 4 L · 20 kg |
| Punctuation | Straight apostrophes (') as in the rest of the project; no full stop on buttons, labels or headings; full stops on sentences | "shop's", "doesn't", "Save price" |

Paint brand, product and shade names are catalogue data: show them as entered.

## 10. Accessibility and change control

Use semantic labels, keyboard navigation on web, readable contrast and scalable text. Do not communicate status by color alone. If a token changes, change `packages/design_tokens/tokens.json`, run `pnpm tokens:generate`, update this document, check affected components/screens and update `docs/PROJECT_STATE.md`. CI fails when the generated files are out of date (`pnpm tokens:check`) or when a screen uses a raw control (`pnpm ui:check`, §8).

Token implementations (generated since DS-001, 2026-11-04):
- Source: `packages/design_tokens/tokens.json` and `brand.json`; generator `generate.mjs` (`pnpm tokens:generate`, `pnpm tokens:check`).
- Flutter: generated `AppColors`, `AppTypography`, `AppRadius`, `AppSpacing`, `AppLayout` and `AppBrand` in `packages/flutter_shared/lib/src/`; hand-written `AppTheme.light()` (Material mapping) and `BrandMark`. Inter is bundled in `packages/flutter_shared/fonts`. Tests check token sizes and WCAG AA contrast.
- Web: generated `apps/admin_web/src/app/tokens.css` (Tailwind v4 `@theme`, imported by `globals.css`) and `src/lib/brand.ts`. Tailwind's default palette, font sizes, radii, container sizes and breakpoints are reset, so only these tokens are available. The font is loaded once in `src/app/fonts.ts` (`next/font`). `BrandMark` (`src/components/brand/`) shows the product mark; page titles use the root title template.
- Where this document lists a weight range (for example 600/700), Flutter uses the first value. On the web, apply the weight with a `font-*` utility.
- Web components (since AUTH-001, `apps/admin_web/src/components`): `Button` (primary/secondary, pending state, 48 px minimum height), `SubmitButton`, `Field` (label, helper text and error linked through `aria-describedby`), `Alert` (tone stated in text, `role="alert"` for errors), `PageHeader`, `Spinner`, `StateMessage` (empty/error/access states) and `AppShell` (persistent sidebar from the `desktop` breakpoint, compact top bar below it). They use the token utilities only.
- Web components added in SHP-003: `SelectField` (labelled native select with the `Field` wiring), `PageLoading` (page-level Suspense fallback so console navigation is instant) and `OnboardingChecklist` (item status as words plus a badge, "x of y done", an "Add" link per open item).
- Components added in PLT-002: web `ReviewPanel` (the next step for each shop status, in words) and `ReviewDecisionForm` (native radios and checkboxes with legends and field errors); status wording in one place (`lib/shops/labels.ts`: Draft, In review, Changes requested, Live) and review reasons as sentences (`lib/shops/review.ts`); Shop App `shop_review.dart` uses the same wording.
- Web components added in CAT-002: `PackPriceFields`, `CatalogueListingForm`, `OwnProductForm`, `PackRowForm`, `AddPackForm`, `ActionButtonForm` (one-button forms such as availability switches, with an accessible name for the target) and `OwnShadeForm`. `ShadeSwatch` moved to `components/catalogue/`. Money: typed in rupees and shown with `formatRupees` (Indian grouping, `₹1,23,456.78`) in tabular numerals (`lib/money.ts`).
- Web components added in CAT-001: `TextareaField`, `CheckboxField` (48 px target), `FormStatus`, catalogue forms (brand, category, product, shade, import), `ActiveToggleForm`, `ShadeSwatch` (indicative colour swatch with the code and name always in text) and `ImageUploadForm` (the SHP-004 photo form, generalised). `NavLinks` takes a `label` for secondary navigation. Counts use `countLabel` ("1 product", "12 products").
- Web component added in SHP-004: `ShopPhotoForm` (4:3 frame with the current photo, a local preview or "No photo yet", labelled file input, errors announced). Shop App: a 4:3 photo card with loading and error states.
- Flutter shared widget added in SHP-003: `ShopLocationMap` (a static OpenStreetMap preview with the shop pin and the attribution since SHP-006, or a bordered panel with the coordinates when maps are turned off); the only place the apps use a map provider.
- Flutter shared widgets (since SHP-002, `packages/flutter_shared`): `LoadingView` (spinner with a visible message), `MessageView` (title, explanation and action for empty, access and not-found states) and `ErrorView` (with "Try again"). The Shop App shows status as text (a badge since DS-002), uses 48 px minimum touch targets, and lets error text wrap instead of truncating.
- DS-002 (D-039): component tokens and the component library in §8. The web and Flutter now share one definition per component: the Flutter secondary button uses dark text like the web (it was brand blue), buttons use the body-large semibold label on both, the shop status is a pill badge (was a chip), and location messages in the Shop App sit in an inline message box (were coloured text).

## 12. States and page anatomy (UX-001, 2026-11-08)

Learned from Shopify Admin, Stripe Dashboard, Linear and GOV.UK patterns:
- **Page anatomy:** `PageHeader` (back link on detail pages, status badges in the description, one primary action on the right), then `gap-6` content. Detail pages: main column plus a `22rem` aside, all sections built with `Section`.
- **Loading:** the header and section titles render at once (static shell); each data section shows the skeleton shaped like its content.
- **Errors:** a failing section shows `SectionBoundary`'s inline message; a failing page keeps the console menu (`error.tsx` inside each console) with Try again and a way back. API calls time out after 12 s (uploads 45 s) so nothing loads forever.
- **Not found:** each record type has its own message inside the console ("Order not found", "Customer not found", "Review not found").
- **Empty:** every list and section says what is missing and offers the next action; inside cards use `StateMessage variant="plain"`.
- **Feedback:** every change confirms with a toast (`ToastHost` lives in the console shell); destructive changes ask first (`ConfirmActionButton`). No success banners kept in the URL.
