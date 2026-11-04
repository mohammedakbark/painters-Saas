import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  checkRepository,
  checkedFiles,
  scanFlutter,
  scanWeb,
} from '../check-components.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const found = (violations) => violations.map((v) => v.found);

describe('web rules (D-039)', () => {
  it('flags raw form controls but allows hidden inputs', () => {
    const tsx = [
      '<input type="hidden" name="status" value="ARCHIVED" />',
      '<input',
      '  id="q"',
      '  name="q"',
      '/>',
      '<select name="unit">',
      '<textarea name="note" />',
      '<button type="submit">Go</button>',
      '<dialog open>',
    ].join('\n');
    const violations = scanWeb(tsx);
    assert.deepEqual(found(violations), [
      '<input',
      '<select',
      '<textarea',
      '<button',
      '<dialog',
    ]);
    assert.equal(violations[0].line, 2);
    assert.match(violations[0].use, /Field/);
  });

  it('flags base radii and raw hex colours, not component radii', () => {
    const tsx = [
      '<div className="rounded-large border p-4" />',
      '<div className="rounded-t-medium" />',
      '<div className="rounded-card rounded-control rounded-panel" />',
      '<p className="text-[#ff0000]" />',
    ].join('\n');
    assert.deepEqual(found(scanWeb(tsx)), [
      'rounded-large',
      'rounded-t-medium',
      '-[#ff0000]',
    ]);
  });

  it('ignores comments', () => {
    const tsx = [
      '// <select> keeps its first option',
      ' * <button> in a doc comment',
    ].join('\n');
    assert.deepEqual(scanWeb(tsx), []);
  });
});

describe('Flutter rules (D-039)', () => {
  it('flags raw Material controls and overlays', () => {
    const dart = [
      "FilledButton(onPressed: save, child: Text('Save'))",
      'OutlinedButton.icon(onPressed: f, icon: i, label: l)',
      'TextField(controller: c)',
      'DropdownButtonFormField<String>(items: items)',
      'Switch(value: v, onChanged: f)',
      'Card(child: c)',
      'ListTile(title: t)',
      'showDialog<bool>(context: context, builder: b)',
      'showModalBottomSheet(context: context, builder: b)',
      'ScaffoldMessenger.of(context).showSnackBar(bar)',
      'Image.network(url)',
      'const CircularProgressIndicator()',
    ].join('\n');
    assert.deepEqual(found(scanFlutter(dart)), [
      'FilledButton(',
      'OutlinedButton.icon(',
      'TextField(',
      'DropdownButtonFormField<String>(',
      'Switch(',
      'Card(',
      'ListTile(',
      'showDialog<',
      'showModalBottomSheet(',
      'showSnackBar(',
      'Image.network(',
      'CircularProgressIndicator(',
    ]);
  });

  it('flags literal colours and radii', () => {
    const dart = [
      'color: Color(0xFF123456),',
      'color: Colors.red,',
      'borderRadius: BorderRadius.circular(8),',
    ].join('\n');
    assert.deepEqual(found(scanFlutter(dart)), [
      'Color(0x',
      'Colors.red',
      'BorderRadius.circular(',
    ]);
  });

  it('allows the project components and their names inside other words', () => {
    const dart = [
      "AppButton(label: 'Save', onPressed: save)",
      "AppCard(child: Text('x'))",
      'AppTextField(label: l)',
      'showAppDialog<bool>(context: context, title: t)',
      'showAppBottomSheet(context: context, title: t, builder: b)',
      "showAppSnackBar(context, 'Saved.')",
      'AppNetworkImage(url: u, semanticLabel: s)',
      '/// Replaces showDialog and AlertDialog.',
    ].join('\n');
    assert.deepEqual(scanFlutter(dart), []);
  });
});

describe('repository', () => {
  it('checks the web app and every Flutter package, not the components', () => {
    const { web, flutter } = checkedFiles(root);
    assert.ok(web.some((path) => path.startsWith('apps/admin_web/src/app/')));
    assert.ok(!web.some((path) => path.includes('/components/ui/')));
    assert.ok(!web.some((path) => path.endsWith('.test.tsx')));
    assert.ok(flutter.some((path) => path.startsWith('apps/shop_app/lib/')));
    assert.ok(
      flutter.some((path) => path.startsWith('apps/customer_app/lib/')),
    );
    assert.ok(
      !flutter.some((path) =>
        path.startsWith('packages/flutter_shared/lib/src/components/'),
      ),
    );
  });

  it('has no raw controls in the screens', () => {
    assert.deepEqual(checkRepository(root).violations, []);
  });
});
