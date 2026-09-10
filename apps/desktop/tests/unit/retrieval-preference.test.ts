// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRetrievalPreferenceStore } from '../../src/main/retrieval-preference-store';
import { parseRetrievalPreference } from '../../src/shared/retrieval-preference';

describe('retrieval preference', () => {
  it('rejects invalid payloads instead of coercing them to ON', () => {
    expect(parseRetrievalPreference(null)).toBeNull();
    expect(parseRetrievalPreference({})).toBeNull();
    expect(parseRetrievalPreference({ smartEnabled: 'yes' })).toBeNull();
    expect(parseRetrievalPreference({ smartEnabled: false })).toEqual({ smartEnabled: false });
  });

  it('does not persist invalid writes', () => {
    const filePath = join(mkdtempSync(join(tmpdir(), 'retrieval-pref-')), 'preference.json');
    writeFileSync(filePath, `${JSON.stringify({ smartEnabled: false })}\n`);
    const store = loadRetrievalPreferenceStore(filePath);
    expect(store.read()).toEqual({ smartEnabled: false });
    expect(parseRetrievalPreference({ smartEnabled: 1 })).toBeNull();
    expect(JSON.parse(readFileSync(filePath, 'utf8'))).toEqual({ smartEnabled: false });
  });
});
