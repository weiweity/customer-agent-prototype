import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyPackagedRetrievalDefaults,
  defaultStackWritePath,
  defaultSyntheticStackFile,
  originKeyedStackFile,
  resolveRetrievalStackFile,
  resolveStackFile,
} from '../../src/main/packaged-retrieval-paths';
import { loadRetrievalPreferenceStore } from '../../src/main/retrieval-preference-store';

const directories: string[] = [];
const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('packaged retrieval defaults', () => {
  it('leaves env alone when the off-repo files are missing', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'packaged-retrieval-missing-'));
    directories.push(root);
    const env: NodeJS.ProcessEnv = {
      CUSTOMER_AGENT_HYDRATE_INDEX: '/tmp/from-shell-hydrate.json',
      CUSTOMER_AGENT_RETRIEVAL_INDEX: '/tmp/from-shell-index.json',
    };
    applyPackagedRetrievalDefaults(env, {
      hydrate: path.join(root, 'retrieval-hydrate.json'),
      index: path.join(root, 'retrieval-index.json'),
    });
    expect(env.CUSTOMER_AGENT_HYDRATE_INDEX).toBe('/tmp/from-shell-hydrate.json');
    expect(env.CUSTOMER_AGENT_RETRIEVAL_INDEX).toBe('/tmp/from-shell-index.json');
  });

  it('points packaged env at existing off-repo files and ignores shell paths', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'packaged-retrieval-present-'));
    directories.push(root);
    const hydrate = path.join(root, 'retrieval-hydrate.json');
    const index = path.join(root, 'retrieval-index.json');
    writeFileSync(hydrate, '{}\n');
    writeFileSync(index, '{}\n');
    const env: NodeJS.ProcessEnv = {
      CUSTOMER_AGENT_HYDRATE_INDEX: '/tmp/from-shell-hydrate.json',
      CUSTOMER_AGENT_RETRIEVAL_INDEX: '/tmp/from-shell-index.json',
    };
    applyPackagedRetrievalDefaults(env, { hydrate, index });
    expect(env.CUSTOMER_AGENT_HYDRATE_INDEX).toBe(hydrate);
    expect(env.CUSTOMER_AGENT_RETRIEVAL_INDEX).toBe(index);
  });

  it('names the default files next to the synthetic stack root', () => {
    expect(defaultSyntheticStackFile('retrieval-hydrate.json', '/Users/demo')).toBe(
      '/Users/demo/.customer-agent-synthetic-stack/retrieval-hydrate.json',
    );
  });

  it('falls back to an existing stack file only when the env path is unset', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'stack-file-fallback-'));
    directories.push(root);
    const fallback = path.join(root, 'retrieval-hydrate.json');
    writeFileSync(fallback, '{}\n');
    expect(resolveStackFile(undefined, fallback)).toBe(fallback);
    expect(resolveStackFile('', fallback)).toBeUndefined();
    expect(resolveStackFile('/tmp/explicit.json', fallback)).toBe('/tmp/explicit.json');
  });

  it('applies defaults after the product profile and before search IPC', () => {
    const main = readFileSync(path.join(desktopRoot, 'src/main/main.ts'), 'utf8');
    expect(main).toContain('applyPackagedRetrievalDefaults(process.env, { apiOrigin: productProfile.apiOrigin })');
    const searchIpc = readFileSync(path.join(desktopRoot, 'src/main/product-search-ipc.ts'), 'utf8');
    expect(searchIpc).not.toMatch(/^const preferenceStore = loadRetrievalPreferenceStore/m);
    expect(main).not.toContain('if (app.isPackaged) applyPackagedRetrievalDefaults(process.env);');
    expect(main.indexOf('applyPackagedRetrievalDefaults(process.env, { apiOrigin: productProfile.apiOrigin })'))
      .toBeGreaterThan(main.indexOf('resolveProductProfile(app.isPackaged, userDataDirectory, process.env)'));
    expect(main.indexOf('applyPackagedRetrievalDefaults(process.env, { apiOrigin: productProfile.apiOrigin })'))
      .toBeLessThan(main.indexOf('registerProductSearchIpc('));
  });

  it('keeps the same origin key as the session file and isolates catalogs', () => {
    const home = mkdtempSync(path.join(tmpdir(), 'packaged-retrieval-home-'));
    directories.push(home);
    mkdirSync(path.join(home, '.customer-agent-synthetic-stack'));
    const local = 'http://127.0.0.1:43100';
    const remote = 'https://agent-auth.jianghua.site';
    const sessionId = createHash('sha256').update(local).digest('hex').slice(0, 16);
    expect(originKeyedStackFile('retrieval-hydrate.json', local, home)).toContain(sessionId);
    const unkeyed = defaultSyntheticStackFile('retrieval-hydrate.json', home);
    writeFileSync(unkeyed, '{}\n');
    expect(resolveRetrievalStackFile('retrieval-hydrate.json', remote, home)).toBe(unkeyed);
    const keyed = originKeyedStackFile('retrieval-hydrate.json', remote, home);
    writeFileSync(keyed, '{}\n');
    expect(resolveRetrievalStackFile('retrieval-hydrate.json', remote, home)).toBe(keyed);
    expect(resolveRetrievalStackFile('retrieval-hydrate.json', local, home)).toBe(unkeyed);
  });

  it('points unset env at origin-keyed paths so login cannot overwrite another catalog', () => {
    const home = mkdtempSync(path.join(tmpdir(), 'packaged-retrieval-isolate-'));
    directories.push(home);
    const env: NodeJS.ProcessEnv = {};
    applyPackagedRetrievalDefaults(env, { apiOrigin: 'https://agent-auth.jianghua.site', home });
    expect(env.CUSTOMER_AGENT_HYDRATE_INDEX).toBe(
      originKeyedStackFile('retrieval-hydrate.json', 'https://agent-auth.jianghua.site', home),
    );
    expect(env.CUSTOMER_AGENT_RETRIEVAL_INDEX).toBe(
      originKeyedStackFile('retrieval-index.json', 'https://agent-auth.jianghua.site', home),
    );
    expect(env.CUSTOMER_AGENT_EMBEDDING_INDEX).toBe(
      originKeyedStackFile('retrieval-embeddings.json', 'https://agent-auth.jianghua.site', home),
    );
    expect(env.CUSTOMER_AGENT_RETRIEVAL_PREFERENCE).toBe(
      originKeyedStackFile('retrieval-preference.json', 'https://agent-auth.jianghua.site', home),
    );
  });

  it('keeps smart-retrieval toggles from two API origins in separate files', () => {
    const home = mkdtempSync(path.join(tmpdir(), 'packaged-retrieval-pref-'));
    directories.push(home);
    mkdirSync(path.join(home, '.customer-agent-synthetic-stack'));
    const local = 'http://127.0.0.1:43100';
    const remote = 'https://agent-auth.jianghua.site';
    const localEnv: NodeJS.ProcessEnv = {};
    const remoteEnv: NodeJS.ProcessEnv = {};
    applyPackagedRetrievalDefaults(localEnv, { apiOrigin: local, home });
    applyPackagedRetrievalDefaults(remoteEnv, { apiOrigin: remote, home });
    expect(localEnv.CUSTOMER_AGENT_RETRIEVAL_PREFERENCE).not.toBe(
      remoteEnv.CUSTOMER_AGENT_RETRIEVAL_PREFERENCE,
    );
    loadRetrievalPreferenceStore(localEnv.CUSTOMER_AGENT_RETRIEVAL_PREFERENCE!).write({ smartEnabled: false });
    loadRetrievalPreferenceStore(remoteEnv.CUSTOMER_AGENT_RETRIEVAL_PREFERENCE!).write({ smartEnabled: true });
    expect(loadRetrievalPreferenceStore(localEnv.CUSTOMER_AGENT_RETRIEVAL_PREFERENCE!).read()).toEqual({
      smartEnabled: false,
    });
    expect(loadRetrievalPreferenceStore(remoteEnv.CUSTOMER_AGENT_RETRIEVAL_PREFERENCE!).read()).toEqual({
      smartEnabled: true,
    });
  });

  it('copies a leftover unkeyed catalog into the keyed path and then writes only there', () => {
    const home = mkdtempSync(path.join(tmpdir(), 'packaged-retrieval-seed-'));
    directories.push(home);
    mkdirSync(path.join(home, '.customer-agent-synthetic-stack'));
    const origin = 'https://agent-auth.jianghua.site';
    const unkeyed = defaultSyntheticStackFile('retrieval-hydrate.json', home);
    writeFileSync(unkeyed, '{"releaseId":"rel-unkeyed"}\n');
    const env: NodeJS.ProcessEnv = {};
    applyPackagedRetrievalDefaults(env, { apiOrigin: origin, home });
    const keyed = originKeyedStackFile('retrieval-hydrate.json', origin, home);
    expect(env.CUSTOMER_AGENT_HYDRATE_INDEX).toBe(keyed);
    expect(readFileSync(keyed, 'utf8')).toBe('{"releaseId":"rel-unkeyed"}\n');
    writeFileSync(keyed, '{"releaseId":"rel-keyed"}\n');
    expect(readFileSync(unkeyed, 'utf8')).toBe('{"releaseId":"rel-unkeyed"}\n');
    applyPackagedRetrievalDefaults(env, { apiOrigin: origin, home });
    expect(readFileSync(keyed, 'utf8')).toBe('{"releaseId":"rel-keyed"}\n');
  });

  it('points CLI write paths at origin-keyed files when the desktop API origin is set', () => {
    const home = mkdtempSync(path.join(tmpdir(), 'packaged-retrieval-cli-'));
    directories.push(home);
    const origin = 'https://agent-auth.jianghua.site';
    const env: NodeJS.ProcessEnv = { CUSTOMER_AGENT_DESKTOP_API_ORIGIN: origin };
    expect(defaultStackWritePath('retrieval-hydrate.json', env, home)).toBe(
      originKeyedStackFile('retrieval-hydrate.json', origin, home),
    );
    expect(defaultStackWritePath('retrieval-index.json', {}, home)).toBe(
      defaultSyntheticStackFile('retrieval-index.json', home),
    );
    const hydrateCli = readFileSync(path.join(desktopRoot, '../../scripts/sync-retrieval-hydrate.ts'), 'utf8');
    const embedCli = readFileSync(path.join(desktopRoot, '../../scripts/embed-retrieval-index.ts'), 'utf8');
    const questionsCli = readFileSync(path.join(desktopRoot, '../../scripts/enrich-retrieval-questions.ts'), 'utf8');
    expect(hydrateCli).toContain("defaultStackWritePath('retrieval-hydrate.json')");
    expect(embedCli).toContain("defaultStackWritePath('retrieval-embeddings.json')");
    expect(questionsCli).toContain("defaultStackWritePath('retrieval-index.json')");
  });
});
