# Feature: Required-field marker

- **Feature ID:** DS-004
- **Status:** Complete (local verification; see §4)
- **Last updated:** 2026-11-06
- **Related modules:**
  - web: `components/ui/field-label.tsx` (`RequiredMark`, `FieldLabel`, `RequiredFieldsNote`), `Field`, `SelectField`, `TextareaField`, `FileField`, `RadioGroupField`, `CheckboxGroupField`, `ImageUploadForm`;
  - Flutter: `appRequiredLabel`, `AppTextField`, `AppDropdown`, `AppRadioGroup` in `flutter_shared`.
- **Decisions:** D-039 (shared components), DESIGN_SYSTEM §6

## 1. Goal

The product owner asked (2026-11-06) that required fields show an indication. Before this change only "(optional)" in some labels hinted at what was required.

## 2. Behaviour

- **The marker:** a required field shows a red asterisk after its label. Screen readers hear the field's name and "required"; the asterisk itself is not read out.
- **The note:** forms with more than one field say once, above the fields, "Fields marked * are required."
- **What gets marked:** only fields the server always rejects the form without. Optional fields keep "(optional)" and have no marker.
- **The shop profile:** the support mobile, the address (except area and landmark), the map location and the shop photo are marked. The note says they "are needed before you can submit your shop for review. You can save the profile at any time.", which matches the profile rules: saving part-filled is allowed, and the review checklist needs them.
- **Validation:** unchanged. The server's messages still appear next to each field, and the browser's own required pop-ups are not used.

**Marked fields:**

| Where | Fields |
|---|---|
| Sign in (web and Shop App) | Mobile number, 6-digit code; platform: Email, Password |
| Register a shop | Shop name, Your name |
| Shop profile | Support mobile number, Shop number/building/street, City or town, District, State, PIN code, Map location, Shop photo |
| Add from brand catalogue | Price of each pack (MRP stays optional) |
| Add your own product | Product name, Category, Pack size 1 and Price of pack 1 (rows 2 to 4 are optional) |
| Product page | Pack size and price when adding a pack; the price of each pack |
| Shop shades | Shade code, Shade name |
| Shop App pack sheets | Your price; Pack size, or Quantity and Unit |
| Platform catalogue | New brand, Brand name, New category, category Name, Product name, Category, Pack sizes, Shade code, Shade name, import file type and CSV file |
| Platform review | Decision (reasons and note stay conditional, as their labels explain) |
| Image uploads | The file chooser |

## 3. Out of scope

Search and filter fields (they are never required) and the category order (optional).

## 4. Checks (2026-11-06)

| Check | Result |
|---|---|
| admin_web lint, typecheck, tests (194, including the marker, `aria-required`, no native `required`, optional fields unmarked, choice groups, the note), build; `ui:check` | Passed |
| Flutter format, analyze, tests: flutter_shared 68 (required label with red asterisk and spoken "required"; optional field unmarked); shop_app 70 (tests now find fields by their label setting); customer_app 1 | Passed |
| Chrome (local): shop profile and "Add your own product" at 1280 px, markers and notes in place, no console errors | Verified |
