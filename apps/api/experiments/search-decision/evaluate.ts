import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decideSearch, runOriginal, toJudgableAlias } from './decide.js';
import { loadLabSearch } from './lab-search.js';
import { assertFixtureHashes, assertPinnedHashes } from './instrument.js';
import { fixtureRoot, reportRoot } from './paths.js';
import type { CaseSpec, LayerResult, SyntheticSource } from './types.js';

const V3_STRATEGY_DIFF = Object.freeze({
  Q01: 'quoted-unusable: INTERFACE Q1 clarify; v3 reject',
  Q02: 'quoted-unusable: INTERFACE Q1 clarify; v3 reject',
  Q03: 'quoted-unusable: INTERFACE Q1 clarify; v3 reject',
}) as Readonly<Record<string, string>>;

export const KNOWN_UNRESOLVED = Object.freeze(['N10', 'N19']);
export const KNOWN_REASONS = Object.freeze({
  N10: 'mei-wei-marker',
  N19: 'negation-mismatch',
}) as Readonly<Record<string, string>>;

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function matches(actual: LayerResult, expected: CaseSpec['expected']): boolean {
  return actual.decision === expected.decision && sameIds(actual.shownScriptIds, expected.shownScriptIds);
}

export function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixtureRoot(), name), 'utf8')) as T;
}

export function loadSources(): SyntheticSource[] {
  return loadJson<{ sources: SyntheticSource[] }>('sources.json').sources;
}

export function sourceMap(sources: readonly SyntheticSource[]): Map<string, SyntheticSource> {
  return new Map(sources.map((source) => [source.id, source]));
}

export function poolOf(spec: { pool: readonly string[] }, byId: Map<string, SyntheticSource>): SyntheticSource[] {
  return spec.pool.map((id) => {
    const source = byId.get(id);
    if (!source) throw new Error(`missing source ${id}`);
    return source;
  });
}

export type NCase = {
  id: string;
  query: string;
  pool: string[];
  expected: { decision: string; shownScriptIds: string[] };
  unresolved: boolean | string;
  round1_closes_gap?: boolean;
  expectedFacts?: {
    query: Array<{ polarity: string; relation: string; argument: string; marker: string | null }>;
    source: Array<{ sourceId: string; polarity: string; relation: string; argument: string; marker: string | null }>;
    sameRelArg: boolean;
    polarConflict: boolean;
    exceptionEligible: boolean;
    leftoverHit: boolean | null;
    waivedLeftover: boolean;
    compatConflict: boolean | null;
    sourceMustNotContain?: Array<{ polarity: string; relation: string; argument: string }>;
  };
};

export type NAcceptanceSets = {
  kind: 'N_ACCEPTANCE_SETS';
  knownFailed: string[];
  unexpectedFailed: string[];
  failed: string[];
  passed: string[];
  expectedKnown: string[];
  unresolvedReasons: Record<string, string>;
  totals: { n: number; failed: number; passed: number };
};

export async function evaluateNAcceptance(): Promise<NAcceptanceSets> {
  const sources = loadSources();
  const byId = sourceMap(sources);
  const nCases = loadJson<{ cases: NCase[] }>('cases-n.json').cases;
  const failed: string[] = [];
  const knownFailed: string[] = [];
  const unexpectedFailed: string[] = [];
  const passed: string[] = [];
  const unresolvedReasons: Record<string, string> = {};
  for (const spec of nCases) {
    if (spec.unresolved) unresolvedReasons[spec.id] = String(spec.unresolved);
    const decided = await decideSearch(spec.query, poolOf(spec, byId));
    const match = decided.decision === spec.expected.decision
      && sameIds(decided.shownScriptIds, spec.expected.shownScriptIds);
    if (match) {
      passed.push(spec.id);
      continue;
    }
    failed.push(spec.id);
    if (spec.unresolved) knownFailed.push(spec.id);
    else unexpectedFailed.push(spec.id);
  }
  const payload: NAcceptanceSets = {
    kind: 'N_ACCEPTANCE_SETS',
    knownFailed: [...knownFailed].sort(),
    unexpectedFailed: [...unexpectedFailed].sort(),
    failed: [...failed].sort(),
    passed: [...passed].sort(),
    expectedKnown: nCases.filter((spec) => spec.unresolved).map((spec) => spec.id).sort(),
    unresolvedReasons,
    totals: { n: nCases.length, failed: failed.length, passed: passed.length },
  };
  const reports = reportRoot();
  writeFileSync(join(reports, 'n-acceptance.json'), `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

export function assertKnownFailSets(payload: NAcceptanceSets): void {
  const want = [...KNOWN_UNRESOLVED];
  if (payload.kind !== 'N_ACCEPTANCE_SETS') throw new Error('kind');
  if (JSON.stringify(payload.unexpectedFailed) !== '[]') {
    throw new Error(`unexpectedFailed=${JSON.stringify(payload.unexpectedFailed)}`);
  }
  if (JSON.stringify(payload.knownFailed) !== JSON.stringify(want)) {
    throw new Error(`knownFailed=${JSON.stringify(payload.knownFailed)}`);
  }
  if (JSON.stringify(payload.expectedKnown) !== JSON.stringify(want)) {
    throw new Error(`expectedKnown=${JSON.stringify(payload.expectedKnown)}`);
  }
  if (JSON.stringify(payload.failed) !== JSON.stringify(want)) {
    throw new Error(`failed=${JSON.stringify(payload.failed)}`);
  }
  if (payload.unresolvedReasons.N10 !== KNOWN_REASONS.N10) throw new Error('N10 reason');
  if (payload.unresolvedReasons.N19 !== KNOWN_REASONS.N19) throw new Error('N19 reason');
}

export async function runInterfaceExperiment(): Promise<{
  reportPath: string;
  casesPath: string;
  interfacePass: number;
  interfaceTotal: number;
  failedIds: readonly string[];
  unexpectedV3Diffs: readonly string[];
  allowedV3Diffs: readonly string[];
}> {
  const baseline = assertPinnedHashes();
  if (process.env.SEARCH_DECISION_LAB_FIXTURE_ROOT === undefined) assertFixtureHashes();
  const lab = await loadLabSearch();
  const sources = loadSources();
  const byId = sourceMap(sources);
  const interfaceJson = readFileSync(join(fixtureRoot(), 'cases-interface.json'));
  const v3Json = readFileSync(join(fixtureRoot(), 'cases-v3-regression.json'));
  const interfaceCases = (JSON.parse(interfaceJson.toString('utf8')) as { cases: CaseSpec[] }).cases;
  const v3Cases = (JSON.parse(v3Json.toString('utf8')) as { cases: CaseSpec[] }).cases;

  const interfaceRows = [];
  for (const spec of interfaceCases) {
    const pool = poolOf(spec, byId);
    const original = runOriginal(spec.query, pool);
    const decided = await decideSearch(spec.query, pool);
    const available = pool.filter((source) => source.annotation.status === 'ok');
    const inspection = lab.inspectSearch(spec.query, available.map(toJudgableAlias));
    const actual: LayerResult = {
      decision: decided.decision,
      shownScriptIds: decided.shownScriptIds,
    };
    interfaceRows.push(Object.freeze({
      id: spec.id,
      family: spec.family,
      seen: spec.seen,
      bucket: spec.bucket,
      query: spec.query,
      pool: spec.pool,
      expected: spec.expected,
      original,
      decide: { ...actual, step: decided.step, demand: decided.demand },
      inspection: {
        act: inspection.act,
        decision: inspection.decision,
        shownBeforeAmbiguity: inspection.shownBeforeAmbiguity,
        shownAfterAmbiguity: inspection.shownAfterAmbiguity,
        ambiguityEmptied: inspection.ambiguityEmptied,
        candidates: inspection.candidates,
      },
      match: matches(actual, spec.expected),
      note: spec.note,
    }));
  }

  const v3Rows = [];
  for (const spec of v3Cases) {
    const pool = poolOf(spec, byId);
    const decided = await decideSearch(spec.query, pool);
    const actual: LayerResult = {
      decision: decided.decision,
      shownScriptIds: decided.shownScriptIds,
    };
    const match = matches(actual, spec.expected);
    const allowed = spec.id in V3_STRATEGY_DIFF;
    v3Rows.push(Object.freeze({
      id: spec.id,
      query: spec.query,
      v3Expected: spec.expected,
      decide: actual,
      step: decided.step,
      match,
      allowedDiff: allowed,
      unexpected: !match && !allowed,
      reason: allowed ? V3_STRATEGY_DIFF[spec.id] : undefined,
    }));
  }

  const failedIds = interfaceRows.filter((row) => !row.match).map((row) => row.id);
  const unexpectedV3Diffs = v3Rows.filter((row) => row.unexpected).map((row) => row.id);
  const allowedV3Diffs = v3Rows.filter((row) => !row.match && row.allowedDiff).map((row) => row.id);
  const reports = reportRoot();
  mkdirSync(reports, { recursive: true });
  const report = {
    kind: 'SYNTHETIC_SEARCH_DECISION_LAB',
    status: 'EXPERIMENT_NOT_RUNTIME',
    pinned_product_commit: baseline.product_commit,
    hashes: {
      sources_json: sha256(readFileSync(join(fixtureRoot(), 'sources.json'))),
      cases_interface_json: sha256(interfaceJson),
      cases_v3_regression_json: sha256(v3Json),
    },
    totals: {
      interfaceTotal: interfaceRows.length,
      interfacePass: interfaceRows.filter((row) => row.match).length,
      v3Total: v3Rows.length,
      v3Unchanged: v3Rows.filter((row) => row.match).length,
      v3AllowedStrategyDiff: allowedV3Diffs.length,
      v3UnexpectedDiff: unexpectedV3Diffs.length,
    },
    failedIds,
    allowedV3Diffs,
    unexpectedV3Diffs,
    v3StrategyDiffNotes: V3_STRATEGY_DIFF,
    interfaceRows,
    v3Rows,
  };
  const reportPath = join(reports, 'run.json');
  const casesPath = join(reports, 'cases.jsonl');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(casesPath, `${interfaceRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  const jsonl = readFileSync(casesPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as { id: string });
  if (jsonl.length !== interfaceRows.length) throw new Error('jsonl length');
  for (let index = 0; index < interfaceRows.length; index += 1) {
    if (jsonl[index]?.id !== interfaceRows[index]?.id) throw new Error('jsonl id');
  }
  return {
    reportPath,
    casesPath,
    interfacePass: report.totals.interfacePass,
    interfaceTotal: report.totals.interfaceTotal,
    failedIds: Object.freeze(failedIds),
    unexpectedV3Diffs: Object.freeze(unexpectedV3Diffs),
    allowedV3Diffs: Object.freeze(allowedV3Diffs),
  };
}
