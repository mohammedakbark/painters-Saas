export const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

/** Validated runtime configuration. Read it through `ConfigService<Env, true>`. */
export interface Env {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL: string;
}

const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;
const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);

export class EnvValidationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid environment configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validates environment variables at startup so the API fails fast with a clear
 * message. Error messages name the variable but never echo its value, because
 * values such as DATABASE_URL contain credentials.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const problems: string[] = [];

  const nodeEnv = readString(raw, 'NODE_ENV') ?? 'development';
  if (!isNodeEnvironment(nodeEnv)) {
    problems.push(`NODE_ENV must be one of: ${NODE_ENVIRONMENTS.join(', ')}.`);
  }

  const portText = readString(raw, 'PORT');
  const port = portText === undefined ? DEFAULT_PORT : Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
    problems.push(`PORT must be an integer between 1 and ${MAX_PORT}.`);
  }

  const databaseUrl = readString(raw, 'DATABASE_URL');
  if (databaseUrl === undefined) {
    problems.push('DATABASE_URL is required.');
  } else if (!isPostgresUrl(databaseUrl)) {
    problems.push(
      'DATABASE_URL must be a postgres:// or postgresql:// connection URL.',
    );
  }

  if (problems.length > 0) {
    throw new EnvValidationError(problems);
  }

  return {
    NODE_ENV: nodeEnv as NodeEnvironment,
    PORT: port,
    DATABASE_URL: databaseUrl as string,
  };
}

function readString(
  raw: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = raw[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function isNodeEnvironment(value: string): value is NodeEnvironment {
  return (NODE_ENVIRONMENTS as readonly string[]).includes(value);
}

function isPostgresUrl(value: string): boolean {
  try {
    return POSTGRES_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}
