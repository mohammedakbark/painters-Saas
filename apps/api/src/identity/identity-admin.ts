/**
 * Server-side administration of identity-provider accounts (ADR 0005).
 * The application depends on this port; `SupabaseIdentityAdmin` implements it.
 * Implementations must never log or echo passwords.
 */
export abstract class IdentityAdmin {
  /** Creates a confirmed email + password account. */
  abstract createEmailUser(input: {
    email: string;
    password: string;
  }): Promise<{ subject: string }>;

  /**
   * Deletes an account. Used only to roll back an account this process has
   * just created when the matching database write failed.
   */
  abstract deleteUser(subject: string): Promise<void>;
}

/** The email or phone number already belongs to a provider account. */
export class IdentityConflictError extends Error {
  override readonly name = 'IdentityConflictError';
}

/** The provider rejected the input, for example a weak password. */
export class IdentityRejectedError extends Error {
  override readonly name = 'IdentityRejectedError';

  constructor(readonly code: string) {
    super(`The identity provider rejected the request (${code}).`);
  }
}

/** Unexpected provider failure. Carries only the provider's error code. */
export class IdentityProviderError extends Error {
  override readonly name = 'IdentityProviderError';

  constructor(readonly code: string) {
    super(`The identity provider request failed (${code}).`);
  }
}
