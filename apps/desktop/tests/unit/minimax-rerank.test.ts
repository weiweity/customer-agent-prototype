// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseRerankIds } from '../../src/main/minimax-rerank';

describe('minimax rerank parser', () => {
  it('keeps only allowed ids and drops extras', () => {
    const raw = 'here {"ids":["b","nope","a","b"]} thanks';
    expect(parseRerankIds(raw, ['a', 'b', 'c'])).toEqual(['b', 'a']);
  });

  it('returns empty on invalid payload', () => {
    expect(parseRerankIds('not json', ['a'])).toEqual([]);
    expect(parseRerankIds('{"ids":[1,2]}', ['1'])).toEqual([]);
  });
});
