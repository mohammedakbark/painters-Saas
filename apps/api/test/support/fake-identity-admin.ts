import { randomUUID } from 'node:crypto';
import {
  IdentityAdmin,
  IdentityConflictError,
} from '../../src/identity/identity-admin.js';

/** In-memory identity provider for e2e tests. */
export class FakeIdentityAdmin extends IdentityAdmin {
  readonly users = new Map<string, { email?: string }>();
  readonly deleted: string[] = [];
  /** Forces the next created subject (to simulate database conflicts). */
  nextSubject: string | undefined;

  createEmailUser(input: {
    email: string;
    password: string;
  }): Promise<{ subject: string }> {
    for (const user of this.users.values()) {
      if (user.email === input.email) {
        return Promise.reject(new IdentityConflictError('email_exists'));
      }
    }
    const subject = this.nextSubject ?? randomUUID();
    this.nextSubject = undefined;
    this.users.set(subject, { email: input.email });
    return Promise.resolve({ subject });
  }

  deleteUser(subject: string): Promise<void> {
    this.users.delete(subject);
    this.deleted.push(subject);
    return Promise.resolve();
  }
}
