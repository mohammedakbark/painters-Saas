// SevenPalette logo (DS-003): the shade-card fan, seven swatch strips in a
// half arc. Colours come from tokens.json so the logo follows the palette.
//
//   pnpm --filter design-tokens run logo
//
// Writes the master SVGs next to this file, the web favicon and Apple icon,
// and the 1024 px PNGs that flutter_launcher_icons turns into app icons.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const tokens = JSON.parse(
  readFileSync(join(here, '../tokens.json'), 'utf8'),
).color;
const c = (name) => tokens[name].value;

const WHITE = c('surface.default');
const INK = c('text.primary');
const TEAL = c('brand.primary');
const TEAL_DARK = c('brand.primaryStrong');

/** The seven strips, left to right, for each surface. */
const PALETTES = {
  full: [
    TEAL_DARK,
    TEAL,
    c('logo.tealMid'),
    c('logo.tealLight'),
    c('brand.accent'),
    c('logo.orange'),
    c('brand.highlight'),
  ],
  inverse: [
    c('logo.tealLight'),
    c('logo.mint'),
    WHITE,
    c('brand.accent'),
    c('brand.accent'),
    c('logo.orange'),
    c('brand.highlight'),
  ],
  app: [
    WHITE,
    WHITE,
    c('logo.mist'),
    c('brand.accent'),
    c('brand.accent'),
    c('logo.orange'),
    c('brand.highlight'),
  ],
};

/**
 * Fan drawn in a 100 × 100 box: strips 12 × 62 (radius 4) rotated about a
 * pivot at (50, 84), 24° apart for seven strips (60° for the three-strip
 * small icon), with a pivot dot.
 */
export function fanShapes(colours, pivotColour, stripWidth = 12) {
  const step = colours.length === 7 ? 24 : 60;
  const start = (-(colours.length - 1) / 2) * step;
  const half = stripWidth / 2;
  const radius = Math.min(4 + (stripWidth - 12) / 2, half);
  const strips = colours
    .map(
      (fill, i) =>
        `<rect x="${-half}" y="-74" width="${stripWidth}" height="62" rx="${radius}" fill="${fill}" transform="rotate(${start + i * step})"/>`,
    )
    .join('');
  const pivot = 7 + (stripWidth - 12) / 4;
  return `<g transform="translate(50 84)">${strips}<circle r="${pivot}" fill="${pivotColour}"/></g>`;
}

/** Width and height of the fan's own drawing (pivot dot to strip tips). */
function fanSize(count) {
  const step = count === 7 ? 24 : 60;
  const half = (((count - 1) / 2) * step * Math.PI) / 180;
  const width = 2 * (74 * Math.sin(half) + 6 * Math.cos(half));
  return { width, height: 91 - 10, centreY: (91 + 10) / 2 };
}

/** The whole fan, scaled to `width` and centred at (cx, cy). */
function placeFan(colours, pivotColour, width, stripWidth = 12) {
  const cx = 50;
  const cy = 50;
  const size = fanSize(colours.length);
  const scale = width / size.width;
  const x = cx - 50 * scale;
  const y = cy - size.centreY * scale;
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})">${fanShapes(colours, pivotColour, stripWidth)}</g>`;
}

// The full lock-up mark: the fan's own bounds with a 2-unit margin.
const MARK = fanSize(7);
const MARK_VIEWBOX = `${(50 - MARK.width / 2 - 2).toFixed(2)} 8 ${(MARK.width + 4).toFixed(2)} 85`;

const svg = (inner, viewBox = '0 0 100 100') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>\n`;

const FILES = {
  'mark.svg': svg(fanShapes(PALETTES.full, TEAL_DARK), MARK_VIEWBOX),
  'mark-inverse.svg': svg(
    fanShapes(PALETTES.inverse, c('logo.tealLight')),
    MARK_VIEWBOX,
  ),
  'mark-mono-white.svg': svg(
    fanShapes(Array(7).fill(WHITE), WHITE),
    MARK_VIEWBOX,
  ),
  'mark-mono-black.svg': svg(fanShapes(Array(7).fill(INK), INK), MARK_VIEWBOX),
  // 16 px and favicon: three strips stay readable.
  'icon-small.svg': svg(
    `<rect width="100" height="100" rx="22" fill="${TEAL}"/>` +
      placeFan([WHITE, c('brand.accent'), c('brand.highlight')], WHITE, 84, 24),
  ),
  // iOS and legacy Android: full-bleed teal square (the OS rounds it).
  'app-icon.svg': svg(
    `<rect width="100" height="100" fill="${TEAL}"/>` +
      placeFan(PALETTES.app, WHITE, 78),
  ),
  // Android adaptive foreground: transparent. flutter_launcher_icons insets
  // it by 16 % per side, so a 76-unit fan ends up about 52 % of the icon
  // wide and stays inside the 66 dp safe circle.
  'app-icon-foreground.svg': svg(placeFan(PALETTES.app, WHITE, 76)),
};

const png = (svgText, size) =>
  new Resvg(svgText, { fitTo: { mode: 'width', value: size } })
    .render()
    .asPng();

for (const [name, text] of Object.entries(FILES)) {
  writeFileSync(join(here, name), text);
}

const out = join(here, 'png');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'app-icon-1024.png'), png(FILES['app-icon.svg'], 1024));
writeFileSync(
  join(out, 'app-icon-foreground-1024.png'),
  png(FILES['app-icon-foreground.svg'], 1024),
);

// Web: favicon (SVG) and Apple touch icon, picked up from the app folder.
const webApp = join(root, 'apps/admin_web/src/app');
writeFileSync(join(webApp, 'icon.svg'), FILES['icon-small.svg']);
writeFileSync(join(webApp, 'apple-icon.png'), png(FILES['app-icon.svg'], 180));

console.log(
  `wrote ${Object.keys(FILES).length} SVGs, 2 app icon PNGs, favicon and Apple icon`,
);
