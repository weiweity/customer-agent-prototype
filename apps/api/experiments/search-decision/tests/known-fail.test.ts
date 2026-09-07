import { describe, expect, it } from 'vitest';
import { assertKnownFailSets, evaluateNAcceptance } from '../evaluate.js';

const enabled = process.env.CUSTOMER_AGENT_SEARCH_DECISION_PROVE_KNOWN === '1';

describe.skipIf(!enabled)('known N-fail proof', () => {
  it('records exactly N10/N19 as known failures and no unexpected failures', async () => {
    const payload = await evaluateNAcceptance();
    assertKnownFailSets(payload);
    expect(payload.failed).toEqual(['N10', 'N19']);
  });
});
