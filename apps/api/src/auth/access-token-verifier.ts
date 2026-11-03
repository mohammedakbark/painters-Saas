import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import type { Env } from '../config/env.js';

/**
 * Injection token for the key resolver used to verify token signatures.
 * Production uses the provider's remote JWKS; tests inject a local key set.
 */
export const ACCESS_TOKEN_KEYS = Symbol('ACCESS_TOKEN_KEYS');

/** Asymmetric algorithms only. HS* (shared secret) and `none` are rejected. */
export const ACCEPTED_ALGORITHMS = ['ES256', 'RS256'];

/** Identity proven by a verified access token. */
export interface VerifiedIdentity {
  /** Identity-provider user id (`sub`). */
  subject: string;
  /** Lower case, or null. */
  email: string | null;
  /** E.164, or null. */
  phone: string | null;
}

/** The token is missing required properties, expired or not trustworthy. */
export class InvalidAccessTokenError extends Error {
  override readonly name = 'InvalidAccessTokenError';

  constructor(readonly reason: string) {
    super(`Invalid access token (${reason}).`);
  }
}

/** The signing keys could not be fetched, so no token can be verified right now. */
export class TokenVerificationUnavailableError extends Error {
  override readonly name = 'TokenVerificationUnavailableError';
}

const claimsSchema = z.object({
  sub: z.uuid(),
  email: z.string().optional(),
  phone: z.string().optional(),
  is_anonymous: z.boolean().optional(),
});

const E164 = /^\+[1-9]\d{7,14}$/;

@Injectable()
export class AccessTokenVerifier {
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    @Inject(ACCESS_TOKEN_KEYS) private readonly keys: JWTVerifyGetKey,
    config: ConfigService<Env, true>,
  ) {
    this.issuer = config.get('AUTH_ISSUER', { infer: true });
    this.audience = config.get('AUTH_AUDIENCE', { infer: true });
  }

  /** Verifies signature, algorithm, issuer, audience and expiry. */
  async verify(token: string): Promise<VerifiedIdentity> {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.keys, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ACCEPTED_ALGORITHMS,
        requiredClaims: ['sub', 'exp', 'iat'],
      }));
    } catch (error) {
      if (isKeySetUnavailable(error)) {
        throw new TokenVerificationUnavailableError(
          'Signing keys are unavailable.',
          { cause: error },
        );
      }
      throw new InvalidAccessTokenError(
        error instanceof errors.JOSEError ? error.code : 'verification_failed',
      );
    }

    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) {
      throw new InvalidAccessTokenError('unexpected_claims');
    }
    if (claims.data.is_anonymous === true) {
      throw new InvalidAccessTokenError('anonymous_session');
    }
    return {
      subject: claims.data.sub,
      email: normalizeEmail(claims.data.email),
      phone: normalizePhone(claims.data.phone),
    };
  }
}

/**
 * Failures to obtain the signing keys (not a bad token): timeouts, a non-200
 * or malformed JWKS response (jose reports those as JWKSInvalid or a generic
 * JOSEError) and network errors.
 */
function isKeySetUnavailable(error: unknown): boolean {
  if (
    error instanceof errors.JWKSTimeout ||
    error instanceof errors.JWKSInvalid
  ) {
    return true;
  }
  if (error instanceof errors.JOSEError) {
    return error.code === 'ERR_JOSE_GENERIC';
  }
  // fetch() failures surface as TypeError / AbortError from the runtime.
  return error instanceof Error;
}

function normalizeEmail(email: string | undefined): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

/** Supabase sends phone numbers without the leading "+". */
function normalizePhone(phone: string | undefined): string | null {
  const trimmed = phone?.trim();
  if (!trimmed) {
    return null;
  }
  const e164 = trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
  return E164.test(e164) ? e164 : null;
}
