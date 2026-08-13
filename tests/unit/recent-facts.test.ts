import { describe, expect, it } from 'vitest';
import {
  RECENT_FACT_KEYS,
  createCopyFact,
  createSearchFact,
} from '../../src/renderer/features/recent/facts';

const FULL_ANSWER = '这是完整话术正文，近期记录不得保存。';

describe('recent facts', () => {
  it('only stores the allowed proveable fields and never keeps full answers', () => {
    const searchFact = createSearchFact({
      query: '流光手表进水了，我的邮箱是 agent@example.com',
      resultCount: 0,
      outcome: 'no-hit',
    });
    const copyFact = createCopyFact({
      query: '流光手表进水了怎么保修',
      resultCount: 2,
      selectedRank: 1,
      scriptId: 'syn-after-002',
    });

    expect(Object.keys(searchFact).sort()).toEqual([...RECENT_FACT_KEYS].sort());
    expect(Object.keys(copyFact).sort()).toEqual([...RECENT_FACT_KEYS].sort());
    expect(JSON.stringify(searchFact)).not.toContain(FULL_ANSWER);
    expect(JSON.stringify(copyFact)).not.toContain(FULL_ANSWER);
    expect(searchFact).not.toHaveProperty('answerText');
    expect(searchFact).not.toHaveProperty('sentText');
    expect(searchFact).not.toHaveProperty('accepted');
    expect(searchFact).not.toHaveProperty('correct');
    expect(copyFact.queryPreview).not.toContain('agent@example.com');
    expect(copyFact.selectedRank).toBe(1);
    expect(copyFact.scriptId).toBe('syn-after-002');
  });
});
