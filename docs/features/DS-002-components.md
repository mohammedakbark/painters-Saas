# Feature: The project's own UI components

- **Feature ID:** DS-002
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-04
- **Related modules:** `packages/design_tokens`, `apps/admin_web/src/components/ui`, `packages/flutter_shared/lib/src/components`, Shop App, CI
- **Decisions:** D-039 (product owner, 2026-11-04), T-021

## 1. Problem and goal

The product owner asked:

> "Every components in code make custom, such as dropdown, bottom sheet, snackbar, modals, textfield etc… so that helps once the development complete easy to change these designs if needed, changing radius, color, etc."

DS-001 already put colours, radii and spacing in one file. Even so, screens still styled controls themselves:
- Flutter screens used raw Material buttons, cards, list tiles, text fields and dialogs.
- Web pages repeated the card class string 39 times and had raw search, file, radio and checkbox inputs.

Changing, for example, the radius of every button would have meant editing many screens.

**Goal:**
- Every control in a screen is a project component.
- Each component takes its look from **component tokens**, so one token change restyles it everywhere, on the web and in Flutter.
- CI keeps raw controls out.

## 2. User roles and permissions

Not user-facing. It affects developers and the product owner (redesigns).

## 3. Preconditions

DS-001 (single-source tokens).

## 4. Developer flow

1. **Restyle a component:** change its entry under `component` in `packages/design_tokens/tokens.json`, for example `control.radius` or `buttonPrimary.background`. Then run `pnpm tokens:generate`.
2. **Build a screen:** use the components (DESIGN_SYSTEM §8). For a control without a component, add the component first.
3. **Check:** `pnpm ui:check` lists every raw control in a screen, with its location and the component to use.

**Failure paths:**
- A component property that names an unknown token, or a raw value (`12`, `#FF0000`), fails the generator.
- A foreground/background pair below WCAG AA fails the generator.
- A raw control in a screen fails `pnpm ui:check`, and so CI.

## 5. Business rules

1. Screens use only the shared components. On the web these are `components/ui`; in Flutter, the `flutter_shared` components.
2. Component tokens only reference base tokens:
   - `radius` names a radius token;
   - `minHeight` names a layout token;
   - every other property names a colour token.
3. Components are built when a screen needs them, never in advance (CLAUDE.md §4). The web has no dialog or toast yet.
4. A genuine exception to the guard is listed by name, with a reason, in `EXCEPTIONS` in `check-components.mjs`. There are none today.

## 6. UI requirements

Screens keep their layout and copy. In Chrome, the web shop pages show the same radii (16 px cards, 12 px controls), heights (48 px) and colours as before.

Intended visible changes, all bringing the two platforms onto one definition:
- **Flutter secondary buttons** (outlined) have dark text like the web; they were brand blue.
- **Flutter button labels** use the web's 16 px semibold style. As a result, "Resend code" and "Use a different number" on the sign-in code step now sit on two lines.
- **Shop App status:** a pill badge (as on the web) instead of a Material chip.
- **Shop App location messages:** they sit in an inline message box with a coloured edge (like the web `Alert`) instead of plain coloured text.
- **Address suggestion** from the web map: shown as an info `Alert` titled "Address from the map".

## 7. API contract

None.

## 8. Data model and migrations

None.

## 9. Security and privacy

None. The guard is a dependency-free Node script that reads source files only.

## 10. Acceptance criteria

- [x] `tokens.json` has a `component` section. The generator writes it as web utilities (`rounded-control`, `min-h-control`, `bg-button-primary-background`, …) and as `AppComponentTokens` in Dart, and rejects unknown names, raw values and pairs below AA.
- [x] Web: `Card`, `CardList`, `CardLink`, `Panel`, `SearchForm`, `FileField`, `RadioGroupField` and `CheckboxGroupField` exist. The existing components use the component utilities. No screen keeps a raw input, select, textarea, button, dialog, base radius or hex colour.
- [x] Flutter: the following exist and are exported from `flutter_shared`:
  - buttons and inputs: `AppButton`, `AppTextField`, `AppSearchField`, `AppDropdown`;
  - choice controls: `AppSwitchRow`, `AppCheckboxRow`, `AppRadioGroup`, `AppSegmentedControl`;
  - surfaces: `AppCard`, `AppSection`, `AppNavRow`;
  - feedback and overlays: `AppBadge`, `AppInlineMessage`, `showAppSnackBar`, `showAppBottomSheet`, `showAppDialog`, `showAppConfirmDialog`;
  - loading and images: `AppSpinner`, `AppNetworkImage`.
  `AppTheme` reads the component tokens.
- [x] The Shop App and the shared views use only these components.
- [x] `pnpm ui:check` passes and runs in CI.
- [x] `DESIGN_SYSTEM.md` §8, `CLAUDE.md` §6, the ui-implementation skill and the tokens README describe the rule.

## 11. Test plan

- **Generator and guard (`node --test`, 29 tests, 14 new):**
  - component references: unknown token, raw value, WCAG, missing section or `use`;
  - the CSS and Dart output;
  - the guard rules on fixtures: web controls, hidden inputs allowed, radii, hex colours, comments ignored; Flutter controls, overlays, literal colours and radii; components allowed;
  - which files are checked;
  - the repository itself is clean.
- **Web (`ui.test.tsx`, 6 new):**
  - `Card`, `CardList` and `Panel` classes and elements;
  - the subtle tone;
  - `SearchForm` method, action, hidden values and filters;
  - `FileField` descriptions and announced error;
  - radio and checkbox groups: defaults and descriptions.
- **Flutter (`components_test.dart`, 19 tests):**
  - buttons: the touch-target height; loading ignores taps; token colours; labels in the Inter font;
  - inputs: text field label, prefix, error and length limit; search submit and clear; dropdown selection and error;
  - choices: switch row toggle and semantic label; checkbox; radio; segmented control;
  - surfaces and feedback: card tokens and tap; nav row; badge colour; inline message tone label; snack bar message and action;
  - overlays: sheet title and result; sheet above the keyboard; confirm dialog true, false and dismissed.
- **Shop App:** the existing widget tests now find `AppButton`, and all 34 pass.

## 12. Dependencies and open questions

- Dark theme: not requested. Component tokens are colour references, so a dark set can be added later.
- Web `Dialog`/`Toast`: built with the first screen that needs them.

## 13. Implementation notes

**Tokens and generator (`packages/design_tokens`):**
- `tokens.json` gains `component`: `control`, `card`, `panel`, `image`, `swatch`, `navItem`, `inlineMessage`, `sheet`, `dialog`, `snackbar`, `badge`, `buttonPrimary`, `buttonSecondary`, `buttonTertiary`, `buttonDestructive`.
- `lib.mjs`: `validateComponents`, `--color-<component>-<property>`, `--radius-<component>` and `--spacing-<component>` in `tokens.css`, and `renderDartComponents` (new generated `app_component_tokens.dart`).
- New `check-components.mjs`; root script `pnpm ui:check`; CI step "Screens use the shared components".

**Web:**
- New `components/ui/card.tsx`, `search-form.tsx`, `file-field.tsx`, `choice-group-fields.tsx`.
- `button`, `field`, `select-field`, `textarea-field`, `badge`, `alert` and `state-message` use the component utilities.
- 27 screens use `Card`, `CardList`, `CardLink` or `Panel` (one-off codemod).
- The platform catalogue search forms use `SearchForm`, the import and image-upload forms use `FileField`, and the review decision form uses the group fields.

**Flutter (`packages/flutter_shared/lib/src/components/`):**
- New files: `app_button.dart`, `app_text_field.dart` (with `appInputDecoration`, `AppOption`, `AppDropdown`), `app_choices.dart`, `app_card.dart`, `app_feedback.dart` (badge, inline message, snack bar, network image), `app_overlays.dart`, `app_spinner.dart`, `app_tone.dart`.
- Updated: `AppTheme`, `LoadingView`/`ErrorView` and `ShopLocationMap`.
- Shop App: `sign_in_screen`, `sign_out_button`, `shop_picker_screen`, `shop_home_screen` (status badge with `shopStatusTone`) and `shop_profile_screen`.

**Found during verification and fixed:** on the emulator, button and segmented-control labels rendered in Roboto. A button's `textStyle` replaces the inherited style, and the token styles leave the font family to the theme. The fix: both components take their label style from the theme, and a widget test now checks the font.

**Verified locally (2026-11-04):** see `docs/PROJECT_STATE.md` §6 (DS-002).

**Not verified:**
- **Platform console pages in Chrome** (catalogue search, CSV import, review decision form): this session has no platform admin sign-in. They are covered by the component tests, typecheck and the production build.
- **The location confirmation dialog on the emulator:** the emulator's location provider returned no fix during this run, so the error message box was shown instead. The dialog is covered by the widget tests.
- **API e2e:** not re-run (no API change).

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-04 | Requested by the product owner (D-039); specification and implementation |
