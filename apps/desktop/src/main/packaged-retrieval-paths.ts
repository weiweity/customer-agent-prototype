import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Off-repo stack files. Product-mode clients load these without shell env. */
export function defaultSyntheticStackFile(name: string, home = homedir()): string {
  return join(home, '.customer-agent-synthetic-stack', name);
}

export function originKey(apiOrigin: string): string {
  return createHash('sha256').update(apiOrigin).digest('hex').slice(0, 16);
}

export function originKeyedStackFile(name: string, apiOrigin: string, home = homedir()): string {
  const suffix = name.endsWith('.json') ? '.json' : '';
  const stem = suffix.length > 0 ? name.slice(0, -suffix.length) : name;
  return defaultSyntheticStackFile(`${stem}.${originKey(apiOrigin)}${suffix}`, home);
}

/** Prefer origin-keyed files so two API targets do not share a catalog. */
export function resolveRetrievalStackFile(
  name: string,
  apiOrigin: string | undefined,
  home = homedir(),
): string {
  const fallback = defaultSyntheticStackFile(name, home);
  if (!apiOrigin) return fallback;
  const keyed = originKeyedStackFile(name, apiOrigin, home);
  if (existsSync(keyed)) return keyed;
  if (existsSync(fallback)) return fallback;
  return keyed;
}

export const DEFAULT_RETRIEVAL_INDEX_PATH = defaultSyntheticStackFile('retrieval-index.json');
export const DEFAULT_HYDRATE_INDEX_PATH = defaultSyntheticStackFile('retrieval-hydrate.json');
export const DEFAULT_EMBEDDING_INDEX_PATH = defaultSyntheticStackFile('retrieval-embeddings.json');

/**
 * Product-mode startup (packaged or `pnpm dev` with loopback origins) must not
 * depend on a developer shell exporting retrieval paths. Existing off-repo
 * files win. With an API origin, missing files still get origin-keyed default
 * paths so login persist cannot overwrite another target's catalog.
 */
export function applyPackagedRetrievalDefaults(
  env: NodeJS.ProcessEnv,
  paths: {
    hydrate?: string;
    index?: string;
    embeddings?: string;
    apiOrigin?: string;
    home?: string;
  } = {},
): void {
  const hydrate = paths.hydrate ?? resolveRetrievalStackFile(
    'retrieval-hydrate.json',
    paths.apiOrigin,
    paths.home,
  );
  const index = paths.index ?? resolveRetrievalStackFile(
    'retrieval-index.json',
    paths.apiOrigin,
    paths.home,
  );
  const embeddings = paths.embeddings ?? resolveRetrievalStackFile(
    'retrieval-embeddings.json',
    paths.apiOrigin,
    paths.home,
  );
  assignRetrievalEnv(env, 'CUSTOMER_AGENT_HYDRATE_INDEX', hydrate, Boolean(paths.apiOrigin));
  assignRetrievalEnv(env, 'CUSTOMER_AGENT_RETRIEVAL_INDEX', index, Boolean(paths.apiOrigin));
  assignRetrievalEnv(env, 'CUSTOMER_AGENT_EMBEDDING_INDEX', embeddings, Boolean(paths.apiOrigin));
}

function assignRetrievalEnv(
  env: NodeJS.ProcessEnv,
  key: 'CUSTOMER_AGENT_HYDRATE_INDEX' | 'CUSTOMER_AGENT_RETRIEVAL_INDEX' | 'CUSTOMER_AGENT_EMBEDDING_INDEX',
  path: string,
  isolate: boolean,
): void {
  const current = (env[key] ?? '').trim();
  if (existsSync(path) || (isolate && current.length === 0)) {
    env[key] = path;
  }
}

/** Empty string stays empty so tests can opt out. Unset falls back to an existing stack file. */
export function resolveStackFile(explicit: string | undefined, fallback: string): string | undefined {
  if (explicit !== undefined) {
    const trimmed = explicit.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return existsSync(fallback) ? fallback : undefined;
}
