import { describe, expect, it } from 'vitest';
import { MAX_QUERY_CHARS } from '../../src/shared/contracts';
import { SYNTHETIC_SCRIPTS } from '../../src/renderer/data/synthetic-scripts';
import {
  MAX_RESULTS,
  searchScripts,
} from '../../src/renderer/features/search/search-service';
import type { ScriptFixture } from '../../src/renderer/features/search/types';

function fixture(partial: Partial<ScriptFixture> & Pick<ScriptFixture, 'scriptId' | 'questionVariants' | 'answerText'>): ScriptFixture {
  return {
    domain: '产品',
    platform: '测试',
    scopeLabel: '单元测试合成',
    riskLevel: 'low',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    ...partial,
  };
}

describe('searchScripts', () => {
  it('returns stable ranking for the same input and at most 3 results', () => {
    const query = '青岚智能灯怎么调节亮度';
    const first = searchScripts(query);
    expect(first.status).toBe('hit');
    if (first.status !== 'hit') {
      return;
    }
    expect(first.results.length).toBeGreaterThan(0);
    expect(first.results.length).toBeLessThanOrEqual(MAX_RESULTS);
    expect(first.results.map((item) => item.rank)).toEqual(
      first.results.map((_, index) => index + 1),
    );

    for (let run = 0; run < 20; run += 1) {
      const next = searchScripts(query);
      expect(next).toEqual(first);
      if (next.status === 'hit') {
        expect(next.results.map((item) => ({ id: item.scriptId, score: item.score }))).toEqual(
          first.results.map((item) => ({ id: item.scriptId, score: item.score })),
        );
      }
    }
  });

  it('returns no-hit when the query stays below the match threshold', () => {
    const outcome = searchScripts('今天中午虚构星球食堂有没有排骨汤');
    expect(outcome).toEqual({ status: 'no-hit' });
  });

  it('prefers an exact variant hit over a weak token or bigram hit', () => {
    const scripts = [
      fixture({
        scriptId: 'weak-token',
        questionVariants: ['仓库作业与发货政策说明'],
        answerText: 'WEAK_TOKEN_ANSWER',
      }),
      fixture({
        scriptId: 'exact-hit',
        questionVariants: ['订单延迟发货怎么办'],
        answerText: 'EXACT_HIT_ANSWER',
      }),
    ];

    const outcome = searchScripts('订单延迟发货怎么办', scripts);
    expect(outcome.status).toBe('hit');
    if (outcome.status !== 'hit') {
      return;
    }
    expect(outcome.results[0]?.scriptId).toBe('exact-hit');
    expect(outcome.results[0]?.score).toBe(100);
    expect(outcome.results[0]?.score).toBeGreaterThan(outcome.results[1]?.score ?? 0);
  });

  it('returns the original fixture answerText without rewriting', () => {
    const lamp = SYNTHETIC_SCRIPTS.find((item) => item.scriptId === 'syn-prod-001');
    expect(lamp).toBeDefined();
    const outcome = searchScripts('青岚智能灯怎么调节亮度');
    expect(outcome.status).toBe('hit');
    if (outcome.status !== 'hit' || !lamp) {
      return;
    }
    const matched = outcome.results.find((item) => item.scriptId === 'syn-prod-001');
    expect(matched?.answerText).toBe(lamp.answerText);
    expect(matched?.answerText).toContain('青岚家居');
  });

  it('fail-closes on 2001 characters without running ranking', () => {
    const exploding = new Proxy(SYNTHETIC_SCRIPTS, {
      get(target, prop, receiver) {
        if (prop === 'map' || prop === 'length' || prop === Symbol.iterator) {
          throw new Error('search algorithm should not run for oversized queries');
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const tooLong = '测'.repeat(MAX_QUERY_CHARS + 1);
    expect(tooLong.length).toBe(2001);
    expect(searchScripts(tooLong, exploding)).toEqual({
      status: 'invalid',
      reason: 'too-long',
    });
  });

  it('does not reject an exact 2000-character query for length', () => {
    const exact = '测'.repeat(MAX_QUERY_CHARS);
    expect(exact.length).toBe(2000);
    const outcome = searchScripts(exact);
    expect(outcome.status).not.toBe('invalid');
  });
});
