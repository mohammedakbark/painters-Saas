// Generates the web and Flutter token files from tokens.json and brand.json.
//
//   pnpm tokens:generate   write the generated files
//   pnpm tokens:check      fail if a generated file is missing or out of date
//
// See README.md in this folder.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONT_CONSUMERS, readJson, renderAll, validate } from './lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const check = process.argv.includes('--check');

const tokens = readJson(root, 'packages/design_tokens/tokens.json');
const brand = readJson(root, 'packages/design_tokens/brand.json');
const files = Object.fromEntries(
  Object.entries(FONT_CONSUMERS).map(([key, path]) => [
    key,
    readFileSync(join(root, path), 'utf8'),
  ]),
);

const problems = validate(tokens, brand, files);
if (problems.length > 0) {
  console.error('Design tokens are invalid:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const outdated = [];
for (const { path, content } of renderAll(tokens, brand)) {
  const target = join(root, path);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  if (current === content) continue;
  if (check) {
    outdated.push(path);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    console.log(`wrote ${path}`);
  }
}

if (check) {
  if (outdated.length > 0) {
    console.error(
      'Generated design-token files are out of date. Run `pnpm tokens:generate` and commit the result:',
    );
    for (const path of outdated) console.error(`  - ${path}`);
    process.exit(1);
  }
  console.log('Design-token files are up to date.');
}
