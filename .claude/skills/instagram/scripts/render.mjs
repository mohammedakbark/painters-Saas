#!/usr/bin/env node
// Render an HTML poster/cover to PNG with the locally installed Edge or Chrome (headless).
// No npm dependencies. Usage:
//   node .claude/skills/instagram/scripts/render.mjs <input.html> <output.png> <width> <height>
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [input, output, width = '1080', height = '1350'] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: render.mjs <input.html> <output.png> <width> <height>');
  process.exit(2);
}

const candidates = [
  process.env.BROWSER_PATH,
  // Chrome first: Edge's headless screenshot exits 0 without writing a file on some Windows setups.
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error('No Edge/Chrome found. Set BROWSER_PATH to a Chromium-based browser.');
  process.exit(1);
}

const out = resolve(output);
rmSync(out, { force: true });
// A separate profile stops Edge/Chrome from handing the job to an already-running browser and returning early.
const profile = mkdtempSync(join(tmpdir(), 'ig-render-'));
const result = spawnSync(
  browser,
  [
    '--headless=new',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=3000',
    `--window-size=${width},${height}`,
    `--screenshot=${out}`,
    pathToFileURL(resolve(input)).href,
  ],
  { encoding: 'utf8', timeout: 60_000 },
);
rmSync(profile, { recursive: true, force: true, maxRetries: 3 });

if (!existsSync(out) || statSync(out).size === 0) {
  console.error('Render failed.', result.stderr || result.error || '');
  process.exit(1);
}
console.log(`Rendered ${out} (${width}x${height})`);
