import { describe, expect, it } from 'vitest';
import { assertKnownFailSets, evaluateNAcceptance } from '../evaluate.js';

const enabled = process.env.CUSTOMER_AGENT_SEARCH_DECISION_FULL_ACCEPTANCE === '1';

describe.skipIf(!enabled)('N-case full acceptance', () => {
  it('fails non-zero with machine-readable known N10/N19; no unexpected N mismatches', async () => {
    const payload = await evaluateNAcceptance();
    assertKnownFailSets(payload);
    if (payload.failed.length > 0) {
      throw new Error(`n ${payload.failed.length}/${payload.totals.n}: ${payload.failed.join(', ')}`);
    }
    expect(payload.failed).toEqual([]);
  });
});
