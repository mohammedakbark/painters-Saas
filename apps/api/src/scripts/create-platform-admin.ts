import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import {
  type ProvisionOutcome,
  PlatformAdminProvisioning,
  ProvisioningError,
} from '../platform-admin/platform-admin-provisioning.js';
import { readHiddenLine } from './read-hidden-line.js';

/**
 * Operator command: makes an email address a Platform Super Admin.
 *
 *   pnpm --filter api platform-admin:create --email admin@example.com
 *
 * Creates a confirmed Supabase Auth account (the password is read from a
 * hidden prompt, never from arguments), the local user, the PlatformAdmin row
 * and a `platform_admin.granted` audit event. Re-running it is harmless.
 */
const MESSAGES: Record<ProvisionOutcome, string> = {
  created: 'Created the account and granted platform admin access.',
  granted_existing: 'Granted platform admin access to the existing user.',
  already_admin: 'This user is already a platform admin. Nothing changed.',
};

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { email: { type: 'string' } },
    strict: true,
  });
  if (!values.email) {
    console.error(
      'Usage: pnpm --filter api platform-admin:create --email <email>',
    );
    process.exitCode = 2;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const outcome = await app
      .get(PlatformAdminProvisioning)
      .provision(values.email, () =>
        readHiddenLine('Password for the new platform admin: '),
      );
    console.log(MESSAGES[outcome]);
  } catch (error) {
    if (error instanceof ProvisioningError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  } finally {
    await app.close();
  }
}

await main();
