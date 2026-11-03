// Creates the local ES256 JWT signing key for the Supabase Auth stack if it does not exist yet.
// The key file is gitignored and is for local development only. Run with `pnpm supabase:keys`.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const supabaseDir = dirname(fileURLToPath(import.meta.url));
const keysPath = join(supabaseDir, 'signing_keys.json');

function hasKey() {
  if (!existsSync(keysPath)) return false;
  try {
    const keys = JSON.parse(readFileSync(keysPath, 'utf8'));
    return Array.isArray(keys) && keys.length > 0;
  } catch {
    return false;
  }
}

if (hasKey()) {
  console.log('Local signing key already exists; keeping it.');
  process.exit(0);
}

// The CLI appends to an existing file, so start from an empty key set.
writeFileSync(keysPath, '[]\n');
const result = spawnSync(
  'pnpm',
  [
    'exec',
    'supabase',
    'gen',
    'signing-key',
    '--algorithm',
    'ES256',
    '--workdir',
    'infra',
    '--yes',
  ],
  {
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32',
  },
);
if (result.status !== 0 || !hasKey()) {
  console.error('Failed to generate the local signing key.');
  process.exit(1);
}
console.log(
  'Created infra/supabase/signing_keys.json (local only, gitignored).',
);
