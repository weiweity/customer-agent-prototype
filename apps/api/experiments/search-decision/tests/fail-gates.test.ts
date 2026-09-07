import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { API_ROOT, EXPERIMENT_ROOT } from '../paths.js';

const vitest = join(API_ROOT, 'node_modules/vitest/vitest.mjs');

function mutateAndRun(target: 'MX01' | 'N01'): { status: number; output: string } {
  const tmp = mkdtempSync(join(tmpdir(), 'search-decision-lab-gate-'));
  try {
    cpSync(join(EXPERIMENT_ROOT, 'fixtures'), tmp, { recursive: true });
    if (target === 'MX01') {
      const path = join(tmp, 'cases-interface.json');
      const doc = JSON.parse(readFileSync(path, 'utf8')) as { cases: Array<{ id: string; expected: { decision: string; shownScriptIds: string[] } }> };
      const found = doc.cases.find((item) => item.id === 'MX01');
      if (found === undefined) throw new Error('MX01 not found');
      found.expected.decision = 'reject';
      found.expected.shownScriptIds = [];
      writeFileSync(path, `${JSON.stringify(doc)}\n`);
    } else {
      const path = join(tmp, 'cases-n.json');
      const doc = JSON.parse(readFileSync(path, 'utf8')) as { cases: Array<{ id: string; expected: { decision: string; shownScriptIds: string[] } }> };
      const found = doc.cases.find((item) => item.id === 'N01');
      if (found === undefined) throw new Error('N01 not found');
      found.expected.decision = 'show';
      found.expected.shownScriptIds = ['muff-contact'];
      writeFileSync(path, `${JSON.stringify(doc)}\n`);
    }
    const file = target === 'MX01'
      ? join(EXPERIMENT_ROOT, 'tests/interface.test.ts')
      : join(EXPERIMENT_ROOT, 'tests/round1-scope.test.ts');
    const result = spawnSync(process.execPath, [vitest, 'run', file], {
      cwd: API_ROOT,
      env: {
        ...process.env,
        SEARCH_DECISION_LAB_FIXTURE_ROOT: tmp,
        SEARCH_DECISION_LAB_REPORT_DIR: join(tmp, 'reports'),
      },
      encoding: 'utf8',
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    return { status: result.status ?? 1, output };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

describe('mutation fail gates', () => {
  it('interface acceptance exits non-zero and names MX01 after mutating its expectation', () => {
    const result = mutateAndRun('MX01');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('MX01');
  });

  it('round1-scope exits non-zero and names N01 after mutating its expectation', () => {
    const result = mutateAndRun('N01');
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('N01');
  });
});
