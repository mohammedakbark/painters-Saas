// Component guard (D-039): screens use the project's own components, never raw
// framework controls, so a design change is made once in the component and
// its tokens.
//
//   pnpm ui:check   list every raw control outside the component folders
//
// See docs/DESIGN_SYSTEM.md §8 (Components).

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_COMPONENTS = 'components/ui';
const FLUTTER_COMPONENTS = 'flutter_shared';

/** Web: raw form elements and base radii outside `components/ui`. */
export const WEB_RULES = [
  {
    pattern: /<input\b/g,
    allowed: (tag) => /\btype="hidden"/.test(tag),
    use: 'Field, FileField, CheckboxField, CheckboxGroupField, RadioGroupField or SearchForm (hidden inputs are fine)',
  },
  { pattern: /<select\b/g, use: 'SelectField' },
  { pattern: /<textarea\b/g, use: 'TextareaField' },
  { pattern: /<button\b/g, use: 'Button, SubmitButton or ButtonLink' },
  {
    pattern: /<dialog\b/g,
    use: 'a Dialog component in components/ui (add it first)',
  },
  {
    pattern:
      /\brounded(?:-[trblse]{1,2})?-(?:small|medium|large|xlarge|pill)\b/g,
    use: 'Card or CardList, or a component radius such as rounded-card or rounded-control',
  },
  { pattern: /-\[#[0-9A-Fa-f]{3,8}\]/g, use: 'a colour token' },
];

const FLUTTER_WIDGETS = [
  ['FilledButton', 'AppButton'],
  ['OutlinedButton', 'AppButton(variant: AppButtonVariant.secondary)'],
  ['TextButton', 'AppButton(variant: AppButtonVariant.tertiary)'],
  ['ElevatedButton', 'AppButton'],
  ['IconButton', 'AppIconButton'],
  ['TextField', 'AppTextField or AppSearchField'],
  ['TextFormField', 'AppTextField'],
  ['DropdownButton', 'AppDropdown'],
  ['DropdownButtonFormField', 'AppDropdown'],
  ['DropdownMenu', 'AppDropdown'],
  ['Switch', 'AppSwitchRow'],
  ['SwitchListTile', 'AppSwitchRow'],
  ['Checkbox', 'AppCheckboxRow'],
  ['CheckboxListTile', 'AppCheckboxRow'],
  ['Radio', 'AppRadioGroup'],
  ['RadioListTile', 'AppRadioGroup'],
  ['SegmentedButton', 'AppSegmentedControl'],
  ['Chip', 'AppBadge'],
  ['ActionChip', 'AppBadge or AppButton'],
  ['FilterChip', 'AppSegmentedControl'],
  ['ChoiceChip', 'AppSegmentedControl'],
  ['Card', 'AppCard or AppSection'],
  ['ListTile', 'AppNavRow'],
  ['AlertDialog', 'showAppDialog or showAppConfirmDialog'],
  ['SimpleDialog', 'showAppDialog'],
  ['Dialog', 'showAppDialog'],
  ['SnackBar', 'showAppSnackBar'],
  ['BottomSheet', 'showAppBottomSheet'],
  ['CircularProgressIndicator', 'AppSpinner'],
  ['LinearProgressIndicator', 'AppSpinner'],
  ['PopupMenuButton', 'AppMenuButton'],
];

/** Flutter: raw Material controls, overlays and literal styles outside flutter_shared's components. */
export const FLUTTER_RULES = [
  ...FLUTTER_WIDGETS.map(([widget, use]) => ({
    // `FilledButton(` and `FilledButton.icon(`, but not `AppFilledButton(`.
    pattern: new RegExp(
      `(?<![A-Za-z0-9_$])${widget}(?:\\.[a-z]\\w*)?\\s*(?:<[^>()]*>)?\\(`,
      'g',
    ),
    use,
  })),
  { pattern: /\bshowDialog\s*[<(]/g, use: 'showAppDialog' },
  { pattern: /\bshowGeneralDialog\s*[<(]/g, use: 'showAppDialog' },
  { pattern: /\bshowModalBottomSheet\s*[<(]/g, use: 'showAppBottomSheet' },
  { pattern: /\bshowBottomSheet\s*[<(]/g, use: 'showAppBottomSheet' },
  { pattern: /\bshowSnackBar\s*\(/g, use: 'showAppSnackBar' },
  { pattern: /\bshowMenu\s*[<(]/g, use: 'AppMenuButton' },
  { pattern: /\bImage\.network\s*\(/g, use: 'AppNetworkImage' },
  { pattern: /\bColor\(0x/g, use: 'AppColors or AppComponentTokens' },
  { pattern: /\bColors\.\w+/g, use: 'AppColors or AppComponentTokens' },
  {
    pattern: /\bBorderRadius\.circular\s*\(/g,
    use: 'a component (radius comes from AppComponentTokens)',
  },
  {
    pattern: /\bRadius\.circular\s*\(/g,
    use: 'a component (radius comes from AppComponentTokens)',
  },
];

/**
 * Exceptions, each with a reason. Keep this list short: add a component
 * instead whenever possible.
 * `{ file: 'apps/…/x.dart', text: 'Widget(', reason: '…' }`
 */
export const EXCEPTIONS = [];

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

function isCommentLine(text, index) {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const prefix = text.slice(start, index).trimStart();
  return (
    prefix.startsWith('//') || prefix.startsWith('*') || prefix.startsWith('/*')
  );
}

/** Violations in one file's text, as `{ line, found, use }`. */
export function scan(text, rules) {
  const found = [];
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const match of text.matchAll(rule.pattern)) {
      if (isCommentLine(text, match.index)) continue;
      if (rule.allowed) {
        const end = text.indexOf('>', match.index);
        const tag = text.slice(match.index, end === -1 ? undefined : end);
        if (rule.allowed(tag)) continue;
      }
      found.push({
        line: lineOf(text, match.index),
        found: match[0].replace(/\s+/g, ' '),
        use: rule.use,
      });
    }
  }
  return found.sort((a, b) => a.line - b.line);
}

export const scanWeb = (text) => scan(text, WEB_RULES);
export const scanFlutter = (text) => scan(text, FLUTTER_RULES);

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.dart_tool',
  'build',
  'android',
  'ios',
]);

function filesUnder(dir, extension) {
  const out = [];
  let items;
  try {
    items = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const item of items) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      if (!SKIP_DIRS.has(item.name)) out.push(...filesUnder(path, extension));
    } else if (item.name.endsWith(extension)) {
      out.push(path);
    }
  }
  return out;
}

const posix = (path) => path.split(sep).join('/');

/** Which files are checked, relative to the repository root. */
export function checkedFiles(root) {
  const web = filesUnder(join(root, 'apps/admin_web/src'), '.tsx')
    .map((path) => posix(relative(root, path)))
    .filter(
      (path) =>
        !path.includes(`/${WEB_COMPONENTS}/`) && !path.endsWith('.test.tsx'),
    );
  const flutterRoots = [
    ...readdirSync(join(root, 'apps'), { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => join(root, 'apps', item.name, 'lib')),
    join(root, 'packages', FLUTTER_COMPONENTS, 'lib'),
  ];
  const flutter = flutterRoots
    .flatMap((dir) => filesUnder(dir, '.dart'))
    .map((path) => posix(relative(root, path)))
    .filter(
      (path) =>
        !/^packages\/flutter_shared\/lib\/src\/(components|theme|tokens)\//.test(
          path,
        ),
    );
  return { web, flutter };
}

export function checkRepository(root) {
  const { web, flutter } = checkedFiles(root);
  const violations = [];
  const visit = (files, scanner) => {
    for (const file of files) {
      const text = readFileSync(join(root, file), 'utf8');
      for (const v of scanner(text)) {
        const excused = EXCEPTIONS.some(
          (e) => e.file === file && v.found.startsWith(e.text),
        );
        if (!excused) violations.push({ file, ...v });
      }
    }
  };
  visit(web, scanWeb);
  visit(flutter, scanFlutter);
  return { violations, checked: web.length + flutter.length };
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { violations, checked } = checkRepository(root);
  if (violations.length > 0) {
    console.error(
      `Use the shared components (D-039, docs/DESIGN_SYSTEM.md §8). ${violations.length} raw control(s) found:`,
    );
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  ${v.found}  → use ${v.use}`);
    }
    process.exit(1);
  }
  console.log(`Components check passed (${checked} files).`);
}
