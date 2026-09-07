import { describe, expect, it } from 'vitest';
import { decideSearch } from '../decide.js';
import { loadJson, loadSources, poolOf, sameIds, sourceMap, type NCase } from '../evaluate.js';

describe('round-1 in-scope finals', () => {
  it('closes N01/N06/N07/N11/N16 and S16; other resolved N cases match; excludes N10/N19', async () => {
    const sources = loadSources();
    const byId = sourceMap(sources);
    const nCases = loadJson<{ cases: NCase[] }>('cases-n.json').cases;
    const interfaceCases = loadJson<{ cases: Array<{ id: string; query: string; pool: string[] }> }>('cases-interface.json').cases;
    const problems: string[] = [];
    const closed = nCases.filter((spec) => spec.round1_closes_gap);
    expect(closed.map((spec) => spec.id).sort()).toEqual(['N01', 'N06', 'N07', 'N11', 'N16']);
    for (const spec of nCases) {
      if (spec.unresolved) continue;
      const decided = await decideSearch(spec.query, poolOf(spec, byId));
      if (decided.decision !== spec.expected.decision || !sameIds(decided.shownScriptIds, spec.expected.shownScriptIds)) {
        problems.push(`${spec.id} ${decided.decision}/${decided.step} != ${spec.expected.decision}`);
      }
    }
    const s16 = interfaceCases.find((spec) => spec.id === 'S16');
    if (s16 === undefined) throw new Error('S16');
    const s16Decided = await decideSearch(s16.query, poolOf(s16, byId));
    if (s16Decided.decision !== 'reject' || s16Decided.shownScriptIds.length > 0) {
      problems.push(`S16 ${s16Decided.decision} ${s16Decided.step}`);
    }
    expect(problems).toEqual([]);
  });
});
