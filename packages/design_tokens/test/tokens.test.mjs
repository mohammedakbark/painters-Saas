import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FONT_CONSUMERS,
  camelName,
  contrastRatio,
  kebabName,
  readJson,
  rem,
  renderAll,
  renderCss,
  renderDartColors,
  renderDartComponents,
  validate,
} from '../lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const tokens = readJson(root, 'packages/design_tokens/tokens.json');
const brand = readJson(root, 'packages/design_tokens/brand.json');
const files = Object.fromEntries(
  Object.entries(FONT_CONSUMERS).map(([key, path]) => [
    key,
    readFileSync(join(root, path), 'utf8'),
  ]),
);

/** A deep copy of the real tokens, changed by `mutate`. */
function tokensWith(mutate) {
  const copy = structuredClone(tokens);
  mutate(copy);
  return copy;
}

describe('naming', () => {
  it('converts token names for Dart and CSS', () => {
    assert.equal(camelName('brand.primaryStrong'), 'brandPrimaryStrong');
    assert.equal(kebabName('brand.primaryStrong'), 'brand-primary-strong');
    assert.equal(kebabName('bodyLarge'), 'body-large');
  });

  it('converts px to rem without trailing zeros', () => {
    assert.equal(rem(32), '2rem');
    assert.equal(rem(28), '1.75rem');
    assert.equal(rem(600), '37.5rem');
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
    assert.equal(contrastRatio('#777777', '#777777'), 1);
  });
});

describe('validate', () => {
  it('accepts the committed tokens, brand and font consumers', () => {
    assert.deepEqual(validate(tokens, brand, files), []);
  });

  it('rejects an invalid colour value', () => {
    const bad = tokensWith((t) => {
      t.color['brand.primary'].value = 'navy';
    });
    assert.match(validate(bad, brand).join('\n'), /brand\.primary.*#RRGGBB/);
  });

  it('rejects a text pair below WCAG AA', () => {
    const bad = tokensWith((t) => {
      t.color['text.secondary'].value = '#BBBBBB';
    });
    assert.match(
      validate(bad, brand).join('\n'),
      /text\.secondary on surface\.default: .* below WCAG AA/,
    );
  });

  it('rejects a contrast pair that names an unknown token', () => {
    const bad = tokensWith((t) => {
      t.contrastPairs.pairs.push(['text.missing', 'surface.default']);
    });
    assert.match(validate(bad, brand).join('\n'), /unknown colour token/);
  });

  it('rejects an invalid font weight and size', () => {
    const bad = tokensWith((t) => {
      t.typography.body.weight = 450;
      t.typography.title.size = 0;
    });
    const problems = validate(bad, brand).join('\n');
    assert.match(problems, /typography "body": weight/);
    assert.match(problems, /typography "title": size/);
  });

  it('rejects a font family that Flutter does not bundle', () => {
    const bad = tokensWith((t) => {
      t.font.family = 'Roboto';
    });
    assert.match(
      validate(bad, brand, files).join('\n'),
      /"Roboto" is not declared in packages\/flutter_shared\/pubspec\.yaml/,
    );
  });

  it('rejects a web font variable that fonts.ts does not set', () => {
    const bad = tokensWith((t) => {
      t.font.webVariable = '--font-other';
    });
    assert.match(validate(bad, brand, files).join('\n'), /fonts\.ts must load/);
  });

  it('rejects an empty brand name', () => {
    assert.match(
      validate(tokens, { ...brand, shopAppName: ' ' }).join('\n'),
      /brand "shopAppName"/,
    );
  });
});

describe('component tokens (D-039)', () => {
  it('rejects a component property that names an unknown token', () => {
    const bad = tokensWith((t) => {
      t.component.control.radius = 'huge';
      t.component.card.border = 'border.missing';
      t.component.control.minHeight = 'screenWidth';
    });
    const problems = validate(bad, brand).join('\n');
    assert.match(
      problems,
      /component "control\.radius": "huge" is not a radius token/,
    );
    assert.match(
      problems,
      /component "card\.border": "border\.missing" is not a color token/,
    );
    assert.match(
      problems,
      /component "control\.minHeight": "screenWidth" is not a layout token/,
    );
  });

  it('rejects raw values instead of token names', () => {
    const bad = tokensWith((t) => {
      t.component.control.radius = 12;
      t.component.buttonPrimary.background = '#FF0000';
    });
    const problems = validate(bad, brand).join('\n');
    assert.match(problems, /component "control\.radius": 12 is not a radius/);
    assert.match(
      problems,
      /component "buttonPrimary\.background": "#FF0000" is not a color token/,
    );
  });

  it('rejects a component whose text fails WCAG AA on its background', () => {
    const bad = tokensWith((t) => {
      t.component.buttonPrimary.foreground = 'text.secondary';
    });
    assert.match(
      validate(bad, brand).join('\n'),
      /component "buttonPrimary": foreground on background is .* below WCAG AA/,
    );
  });

  it('requires the section and a use for each component', () => {
    const noSection = tokensWith((t) => {
      delete t.component;
    });
    assert.match(
      validate(noSection, brand).join('\n'),
      /component: the section is required/,
    );
    const noUse = tokensWith((t) => {
      delete t.component.sheet.use;
    });
    assert.match(
      validate(noUse, brand).join('\n'),
      /component "sheet": "use" is required/,
    );
  });

  it('emits web utilities that point at the base tokens', () => {
    const css = renderCss(tokens);
    assert.ok(css.includes('--radius-control: var(--radius-medium);'));
    assert.ok(css.includes('--spacing-control: 3rem;'));
    assert.ok(
      css.includes(
        '--color-button-primary-background: var(--color-brand-primary);',
      ),
    );
  });

  it('emits Dart component tokens that reference the base classes', () => {
    const dart = renderDartComponents(tokens);
    for (const line of [
      'static const double controlRadius = AppRadius.medium;',
      'static const double controlMinHeight = AppSpacing.minTouchTarget;',
      'static const Color cardBorder = AppColors.borderDefault;',
    ]) {
      assert.ok(dart.includes(line), line);
    }
  });
});

describe('renderers', () => {
  it('resets the Tailwind defaults and emits every colour', () => {
    const css = renderCss(tokens);
    for (const reset of [
      'color',
      'font',
      'text',
      'radius',
      'container',
      'breakpoint',
    ]) {
      assert.ok(
        css.includes(`--${reset}-*: initial;`),
        `missing ${reset} reset`,
      );
    }
    for (const name of Object.keys(tokens.color)) {
      assert.ok(css.includes(`--color-${kebabName(name)}: `), name);
    }
  });

  it('emits Dart colours as opaque ARGB literals', () => {
    assert.ok(
      renderDartColors(tokens).includes(
        'static const Color brandPrimary = Color(0xFF1F4B7A);',
      ),
    );
  });

  it('keeps Dart code lines within the 80-column dart format limit', () => {
    for (const { path, content } of renderAll(tokens, brand)) {
      if (!path.endsWith('.dart')) continue;
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('//')) continue;
        assert.ok(line.length <= 80, `${path}: ${line}`);
      }
    }
  });

  it('matches the committed generated files (run `pnpm tokens:generate`)', () => {
    for (const { path, content } of renderAll(tokens, brand)) {
      assert.equal(readFileSync(join(root, path), 'utf8'), content, path);
    }
  });
});
