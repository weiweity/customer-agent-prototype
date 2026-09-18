/**
 * Single configuration source for the local synthetic stack.
 *
 * Everything the stack starts (isolated PostgreSQL 15 cluster, synthetic
 * identity provider, API, worker, desktop client) derives its ports, origins,
 * database names and paths from this module. Nothing else may invent a second
 * set of values, and nothing here may point at the user's existing PostgreSQL
 * instance or a non-loopback address.
 *
 * The resolved profile is written atomically to `profile.json` under the stack
 * root so the desktop client (development and packaged) can read the same
 * origins without duplicating them.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const STACK_ROOT = process.env.CUSTOMER_AGENT_STACK_ROOT
  ? path.resolve(process.env.CUSTOMER_AGENT_STACK_ROOT)
  : path.join(os.homedir(), '.customer-agent-synthetic-stack');

export const PROFILE_FILE = path.join(STACK_ROOT, 'profile.json');
export const OIDC_ENV_FILE = path.join(STACK_ROOT, 'oidc.env');

export type OidcBindingRole = 'agent' | 'coach' | 'owner';
export type OidcStackBinding = Readonly<{ subject: string; role: OidcBindingRole }>;
export type OidcStackConfig = Readonly<{
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  bindings: readonly OidcStackBinding[];
}>;

const OIDC_ROLES = new Set<OidcBindingRole>(['agent', 'coach', 'owner']);
const OIDC_SUB = /^[A-Za-z0-9_.:-]{1,128}$/;

export function parseOidcEnvFile(contents: string): OidcStackConfig {
  const values = new Map<string, string>();
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) throw new Error('oidc.env: invalid line');
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (values.has(key)) throw new Error(`oidc.env: duplicate ${key}`);
    values.set(key, value);
  }
  if (values.get('AUTH_MODE') !== 'feishu') throw new Error('oidc.env: AUTH_MODE must be feishu');
  const issuer = values.get('OIDC_ISSUER') ?? '';
  const clientId = values.get('OIDC_CLIENT_ID') ?? '';
  const clientSecret = values.get('OIDC_CLIENT_SECRET') ?? '';
  const redirectUri = values.get('OIDC_REDIRECT_URI') ?? '';
  try {
    const url = new URL(issuer);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/oidc') throw new Error('bad');
  } catch {
    throw new Error('oidc.env: OIDC_ISSUER must be http://127.0.0.1:<port>/oidc');
  }
  if (clientId.length < 8 || clientSecret.length < 16) throw new Error('oidc.env: client credentials invalid');
  try {
    const url = new URL(redirectUri);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/v1/auth/callback') throw new Error('bad');
  } catch {
    throw new Error('oidc.env: OIDC_REDIRECT_URI must be http://127.0.0.1:<port>/v1/auth/callback');
  }
  const bindings: OidcStackBinding[] = [];
  const raw = values.get('OIDC_BINDINGS') ?? '';
  if (raw.length > 0) {
    for (const part of raw.split(',')) {
      const [subject, role] = part.split(':');
      if (!subject || !role || !OIDC_SUB.test(subject) || !OIDC_ROLES.has(role as OidcBindingRole)) {
        throw new Error('oidc.env: OIDC_BINDINGS must be sub:agent|coach|owner');
      }
      bindings.push(Object.freeze({ subject, role: role as OidcBindingRole }));
    }
  }
  return Object.freeze({ issuer, clientId, clientSecret, redirectUri, bindings: Object.freeze(bindings) });
}

export function loadOidcStackConfig(file = OIDC_ENV_FILE): OidcStackConfig | undefined {
  if (!existsSync(file)) return undefined;
  return parseOidcEnvFile(readFileSync(file, 'utf8'));
}
export const PID_DIRECTORY = path.join(STACK_ROOT, 'pids');
export const LOG_DIRECTORY = path.join(STACK_ROOT, 'logs');
export const DATA_DIRECTORY = path.join(STACK_ROOT, 'data');
export const OBJECT_STORE_DIRECTORY = path.join(STACK_ROOT, 'objects');
export const PG_DATA_DIRECTORY = path.join(DATA_DIRECTORY, 'pg15');
export const PG_SOCKET_DIRECTORY = path.join(DATA_DIRECTORY, 'pg15-socket');

export const DATABASE_NAME = 'customer_agent_synthetic';

/** Login roles, one per capability pool. Names must stay distinct per contract. */
export const DATABASE_ROLES = Object.freeze({
  runtime: 'stack_runtime',
  admin: 'stack_content_admin',
  auth: 'stack_backend_auth',
  review: 'stack_backend_review',
  worker: 'stack_backend_worker',
});

/**
 * Loopback ports. These are preferences, not reservations: `start` checks each
 * one and fails closed with a locatable reason instead of silently binding
 * something else, because the desktop client reads the resolved origin from
 * `profile.json` and a silent move would desynchronise the two sides.
 */
export const PREFERRED_PORTS = Object.freeze({
  api: 43100,
  identity: 43101,
});

export const PG_PORT = 43199;

/** Synthetic session identities seeded into `backend_identity.subject_bindings`. */
export const SYNTHETIC_IDENTITIES = Object.freeze([
  Object.freeze({ bindingId: 'synthetic_agent', userId: 'usr_synthetic_agent', role: 'agent', label: '客服坐席（合成）' }),
  Object.freeze({ bindingId: 'synthetic_coach', userId: 'usr_synthetic_coach', role: 'coach', label: '话术师 / 一审（合成）' }),
  Object.freeze({ bindingId: 'synthetic_quality', userId: 'usr_synthetic_quality', role: 'coach', label: '质检复核（合成）' }),
  Object.freeze({ bindingId: 'synthetic_owner', userId: 'usr_synthetic_owner', role: 'owner', label: '运营负责人 / 二审（合成）' }),
]);

/** Non-secret local HMAC material. These never leave this machine. */
export const LOCAL_SECRETS = Object.freeze({
  idempotencyKey: 'synthetic-stack-idempotency-material-000000000001',
  logHashKey: 'synthetic-stack-log-hash-material-00000000000002',
});

export type StackProfile = Readonly<{
  version: 1;
  createdAt: string;
  stackRoot: string;
  apiOrigin: string;
  identityOrigin: string;
  apiPort: number;
  identityPort: number;
  databaseName: string;
  pgPort: number;
  pgSocketDirectory: string;
  objectStoreDirectory: string;
  clientId: string;
}>;

/**
 * Where the packaged desktop client looks for its synthetic profile. Electron's
 * `app.getPath('userData')` on macOS is `~/Library/Application Support/<name>`,
 * and the name is fixed by `app.setName` in the main process. The stack writes
 * the file; the client re-validates every field before using it and fail-closes
 * if the file is missing or not an exact pair of loopback origins.
 *
 * `CUSTOMER_AGENT_DESKTOP_USERDATA` overrides the location for tests and for a
 * client launched with `--user-data-dir`.
 */
export const DESKTOP_PACKAGED_PROFILE_PATH = path.join(
  process.env.CUSTOMER_AGENT_DESKTOP_USERDATA
    ? path.resolve(process.env.CUSTOMER_AGENT_DESKTOP_USERDATA)
    : path.join(os.homedir(), 'Library', 'Application Support', '客服话术浮窗 Demo'),
  'synthetic-stack.json',
);

/**
 * Publish the resolved origins for the packaged client. Only the two loopback
 * origins and an exact mode marker are written — no token, DSN or secret.
 */
export function writeDesktopPackagedProfile(profile: StackProfile): string {
  mkdirSync(path.dirname(DESKTOP_PACKAGED_PROFILE_PATH), { recursive: true });
  const temporary = `${DESKTOP_PACKAGED_PROFILE_PATH}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify({
    mode: 'synthetic-local',
    apiOrigin: profile.apiOrigin,
    identityOrigin: profile.identityOrigin,
  }, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, DESKTOP_PACKAGED_PROFILE_PATH);
  return DESKTOP_PACKAGED_PROFILE_PATH;
}

export function ensureStackDirectories(): void {
  for (const directory of [
    STACK_ROOT, PID_DIRECTORY, LOG_DIRECTORY, DATA_DIRECTORY,
    OBJECT_STORE_DIRECTORY, PG_SOCKET_DIRECTORY,
  ]) mkdirSync(directory, { recursive: true, mode: 0o700 });
}

export function readProfile(): StackProfile | undefined {
  if (!existsSync(PROFILE_FILE)) return undefined;
  try {
    const value: unknown = JSON.parse(readFileSync(PROFILE_FILE, 'utf8'));
    if (!value || typeof value !== 'object') return undefined;
    const profile = value as StackProfile;
    // The recorded root must match where the file was actually read from: a
    // profile left by a different stack root (for example an isolated test run)
    // would otherwise make the stack adopt unrelated paths and pids.
    if (profile.version !== 1 || typeof profile.apiOrigin !== 'string'
      || typeof profile.identityOrigin !== 'string'
      || profile.stackRoot !== STACK_ROOT) return undefined;
    return profile;
  } catch {
    return undefined;
  }
}

export function writeProfile(profile: StackProfile): void {
  ensureStackDirectories();
  const temporary = `${PROFILE_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(profile, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, PROFILE_FILE);
}

/** Environment for the API and worker processes. Secrets stay process-local. */
export function apiEnvironment(
  profile: StackProfile,
  overrides: Readonly<Record<string, string>> = {},
  oidc: OidcStackConfig | undefined = undefined,
): NodeJS.ProcessEnv {
  const socket = new URLSearchParams({ host: profile.pgSocketDirectory, port: String(profile.pgPort) });
  const connection = (role: string) => `postgresql://${role}@localhost/${profile.databaseName}?${socket.toString()}`;
  const environment: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    CUSTOMER_AGENT_PROFILE: 'formal-dev',
    AUTH_MODE: oidc ? 'feishu' : 'mock',
    AUTH_SESSION_MODE: 'product',
    CUSTOMER_AGENT_API_HOST: '127.0.0.1',
    CUSTOMER_AGENT_API_PORT: String(profile.apiPort),
    CUSTOMER_AGENT_BUILD_VERSION: 'synthetic-macos-stack',
    DATABASE_URL: connection(DATABASE_ROLES.runtime),
    CONTENT_ADMIN_DATABASE_URL: connection(DATABASE_ROLES.admin),
    AUTH_DATABASE_URL: connection(DATABASE_ROLES.auth),
    CONTENT_REVIEW_DATABASE_URL: connection(DATABASE_ROLES.review),
    CONTENT_WORKER_DATABASE_URL: connection(DATABASE_ROLES.worker),
    CONTENT_OBJECT_STORE_DIR: profile.objectStoreDirectory,
    IDEMPOTENCY_HMAC_KEYS: JSON.stringify({ 'hmac-idempotency-v1': LOCAL_SECRETS.idempotencyKey }),
    IDEMPOTENCY_HMAC_CURRENT_VERSION: 'hmac-idempotency-v1',
    LOG_HASH_KEY: LOCAL_SECRETS.logHashKey,
    LOG_HASH_KEY_VERSION: 'hmac-log-v1',
    DB_CONNECTION_TIMEOUT_MS: '2000',
    DB_READINESS_TIMEOUT_MS: '3000',
  };
  if (oidc) {
    environment.OIDC_ISSUER = oidc.issuer;
    environment.OIDC_CLIENT_ID = oidc.clientId;
    environment.OIDC_CLIENT_SECRET = oidc.clientSecret;
    environment.OIDC_REDIRECT_URI = oidc.redirectUri;
  } else {
    environment.SYNTHETIC_IDENTITY_PROVIDER_ORIGIN = profile.identityOrigin;
  }
  return { ...environment, ...overrides };
}

export function pgEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, PGCONNECT_TIMEOUT: '5' };
  for (const key of [
    'PGHOST', 'PGHOSTADDR', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD',
    'PGPASSFILE', 'PGSERVICE', 'PGSERVICEFILE', 'PGOPTIONS',
  ]) delete environment[key];
  return environment;
}
