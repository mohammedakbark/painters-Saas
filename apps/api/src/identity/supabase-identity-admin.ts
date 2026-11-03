import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AuthError,
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import {
  IdentityAdmin,
  IdentityConflictError,
  IdentityProviderError,
  IdentityRejectedError,
} from './identity-admin.js';

const CONFLICT_CODES = new Set([
  'email_exists',
  'phone_exists',
  'user_already_exists',
]);
const REJECTED_CODES = new Set([
  'weak_password',
  'validation_failed',
  'email_address_invalid',
]);

/**
 * Supabase Auth admin API, authenticated with the server-only secret key.
 * No session is persisted or refreshed: this client only performs admin calls.
 */
@Injectable()
export class SupabaseIdentityAdmin extends IdentityAdmin {
  private readonly client: SupabaseClient;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.client = createClient(
      config.get('SUPABASE_URL', { infer: true }),
      config.get('SUPABASE_SECRET_KEY', { infer: true }),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  async createEmailUser(input: {
    email: string;
    password: string;
  }): Promise<{ subject: string }> {
    const { data, error } = await this.client.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });
    if (error) {
      throw toIdentityError(error);
    }
    return { subject: data.user.id };
  }

  async deleteUser(subject: string): Promise<void> {
    const { error } = await this.client.auth.admin.deleteUser(subject);
    if (error) {
      throw toIdentityError(error);
    }
  }
}

/** Maps provider errors by code only; provider messages are not propagated. */
function toIdentityError(error: AuthError): Error {
  const code = error.code ?? `http_${error.status ?? 'unknown'}`;
  if (CONFLICT_CODES.has(code)) {
    return new IdentityConflictError(`Identity already exists (${code}).`);
  }
  if (REJECTED_CODES.has(code)) {
    return new IdentityRejectedError(code);
  }
  return new IdentityProviderError(code);
}
