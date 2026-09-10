// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { rankScripts, scoreDocument, type RetrievalScript } from '../../src/shared/semantic-retrieve';

const corpus: readonly RetrievalScript[] = Object.freeze([
  Object.freeze({
    scriptId: 'ship-express',
    title: '发货快递',
    questionText: '发货快递',
    answerText: '订单付款后四十八小时内发出，物流单号同步到订单页。',
  }),
  Object.freeze({
    scriptId: 'eta',
    title: '到货时效',
    questionText: '到货时效',
    answerText: '一般三到五天送达，偏远地区可能更久。',
  }),
  Object.freeze({
    scriptId: 'address',
    title: '改地址',
    questionText: '改地址',
    answerText: '未发货前可以修改一次收货地址。',
  }),
  Object.freeze({
    scriptId: 'mask',
    title: '面膜适用人群',
    questionText: '面膜适用人群',
    answerText: '敏感肌也能用，建议先在耳后试用。',
  }),
]);

describe('semantic retrieve ranking', () => {
  it('maps a shipping sentence to the shipping titles, not address', () => {
    const ranked = rankScripts('什么时候发货啊', corpus);
    expect(ranked[0]?.title).toBe('发货快递');
    expect(ranked.map((row) => row.title)).not.toContain('改地址');
    expect(scoreDocument('什么时候发货啊', corpus[0]!)).toBeGreaterThan(scoreDocument('什么时候发货啊', corpus[2]!));
  });

  it('maps a skin-use sentence onto the mask script', () => {
    const ranked = rankScripts('这款面膜敏感肌可以用吗', corpus);
    expect(ranked[0]?.title).toBe('面膜适用人群');
  });

  it('maps an address-change sentence onto 改地址', () => {
    const ranked = rankScripts('我填错地址了能不能改', corpus);
    expect(ranked[0]?.title).toBe('改地址');
  });
});
