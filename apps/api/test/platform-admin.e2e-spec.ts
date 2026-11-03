import { randomUUID } from 'node:crypto';
import { Controller, Get } from '@nestjs/common';
import request from 'supertest';
import {
  PlatformAdminProvisioning,
  ProvisioningError,
} from '../src/platform-admin/platform-admin-provisioning.js';
import { PlatformAdminOnly } from '../src/platform-admin/platform-admin.guard.js';
import { resetDatabase } from './support/database.js';
import { createTestApp, type TestApp } from './support/test-app.js';
import {
  createTestTokenIssuer,
  type TestTokenIssuer,
} from './support/test-tokens.js';

const STRONG_PASSWORD = 'Correct-Horse-42';

/** Test-only route that exercises the platform-admin guard. */
@Controller('test-platform-probe')
class PlatformProbeController {
  @Get()
  @PlatformAdminOnly()
  probe(): { ok: true } {
    return { ok: true };
  }
}

describe('Platform admin access (e2e, real Postgres)', () => {
  let issuer: TestTokenIssuer;
  let testApp: TestApp;
  let provisioning: PlatformAdminProvisioning;

  beforeAll(async () => {
    issuer = await createTestTokenIssuer();
    testApp = await createTestApp({
      keys: issuer.keys,
      controllers: [PlatformProbeController],
    });
    provisioning = testApp.app.get(PlatformAdminProvisioning);
  });

  beforeEach(async () => {
    await resetDatabase(testApp.prisma);
    testApp.identity.users.clear();
    testApp.identity.deleted.length = 0;
  });

  afterAll(async () => {
    await testApp?.app.close();
  });

  const provision = (email: string, password = STRONG_PASSWORD) =>
    provisioning.provision(email, () => Promise.resolve(password));

  describe('PlatformAdminOnly guard', () => {
    it('allows a platform admin', async () => {
      await provision('root@example.com');
      const [subject] = testApp.identity.users.keys();

      await request(testApp.app.getHttpServer())
        .get('/v1/test-platform-probe')
        .set('Authorization', `Bearer ${await issuer.sign({ sub: subject })}`)
        .expect(200)
        .expect({ ok: true });
    });

    it('answers 403 platform_admin_required to any other user', async () => {
      const response = await request(testApp.app.getHttpServer())
        .get('/v1/test-platform-probe')
        .set('Authorization', `Bearer ${await issuer.sign()}`)
        .expect(403);

      expect(response.body).toMatchObject({
        status: 403,
        code: 'platform_admin_required',
      });
    });

    it('answers 401 without a token (authentication runs first)', () =>
      request(testApp.app.getHttpServer())
        .get('/v1/test-platform-probe')
        .expect(401));
  });

  describe('provisioning (operator script logic)', () => {
    it('creates the identity, user, admin row and audit event together', async () => {
      await expect(provision('  Root@Example.com ')).resolves.toBe('created');

      const user = await testApp.prisma.user.findUniqueOrThrow({
        where: { email: 'root@example.com' },
        include: { platformAdmin: true },
      });
      expect(user.platformAdmin?.role).toBe('SUPER_ADMIN');
      expect(testApp.identity.users.get(user.authSubject)).toEqual({
        email: 'root@example.com',
      });
      const events = await testApp.prisma.auditEvent.findMany();
      expect(events).toEqual([
        expect.objectContaining({
          actorType: 'SYSTEM',
          actorUserId: null,
          action: 'platform_admin.granted',
          entityType: 'user',
          entityId: user.id,
          metadata: { role: 'SUPER_ADMIN', source: 'operator_script' },
        }),
      ]);
      expect(JSON.stringify(events)).not.toContain(STRONG_PASSWORD);
    });

    it('is idempotent and does not ask for a password again', async () => {
      await provision('root@example.com');
      const readPassword = vi.fn(() => Promise.resolve(STRONG_PASSWORD));

      await expect(
        provisioning.provision('root@example.com', readPassword),
      ).resolves.toBe('already_admin');
      expect(readPassword).not.toHaveBeenCalled();
      expect(await testApp.prisma.platformAdmin.count()).toBe(1);
      expect(await testApp.prisma.auditEvent.count()).toBe(1);
    });

    it('grants access to an existing local user without creating an identity', async () => {
      await testApp.prisma.user.create({
        data: { authSubject: randomUUID(), email: 'ops@example.com' },
      });

      await expect(provision('ops@example.com')).resolves.toBe(
        'granted_existing',
      );
      expect(testApp.identity.users.size).toBe(0);
      expect(await testApp.prisma.auditEvent.count()).toBe(1);
    });

    it.each([
      ['short', 'Ab1'],
      ['without upper case', 'correct-horse-42'],
      ['without a digit', 'Correct-Horse-Battery'],
    ])('rejects a password that is %s', async (_name, password) => {
      await expect(provision('root@example.com', password)).rejects.toThrow(
        ProvisioningError,
      );
      expect(testApp.identity.users.size).toBe(0);
    });

    it('rejects an invalid email before asking for a password', async () => {
      const readPassword = vi.fn(() => Promise.resolve(STRONG_PASSWORD));

      await expect(
        provisioning.provision('not-an-email', readPassword),
      ).rejects.toThrow('Enter a valid email address.');
      expect(readPassword).not.toHaveBeenCalled();
    });

    it('refuses to silently link an Auth account it did not create', async () => {
      testApp.identity.users.set(randomUUID(), { email: 'root@example.com' });

      await expect(provision('root@example.com')).rejects.toThrow(
        /already exists but is not linked/,
      );
      expect(await testApp.prisma.user.count()).toBe(0);
    });

    it('rolls back the new identity when the database write fails', async () => {
      const takenSubject = randomUUID();
      await testApp.prisma.user.create({ data: { authSubject: takenSubject } });
      testApp.identity.nextSubject = takenSubject;

      await expect(provision('root@example.com')).rejects.toThrow();

      expect(testApp.identity.deleted).toEqual([takenSubject]);
      expect(await testApp.prisma.platformAdmin.count()).toBe(0);
      expect(await testApp.prisma.auditEvent.count()).toBe(0);
    });
  });

  it('audit events are append-only in the database', async () => {
    await provision('root@example.com');

    await expect(
      testApp.prisma.auditEvent.updateMany({ data: { action: 'tampered' } }),
    ).rejects.toThrow(/append-only/);
    await expect(testApp.prisma.auditEvent.deleteMany()).rejects.toThrow(
      /append-only/,
    );
    expect(await testApp.prisma.auditEvent.count()).toBe(1);
  });
});
