// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { rankScripts, type RetrievalScript } from '../../src/shared/hybrid-retrieve';
import { analyzeQuery } from '../../src/shared/query-analyze';

const corpus: readonly RetrievalScript[] = Object.freeze([
  Object.freeze({
    scriptId: 'ship-express',
    title: '发货快递',
    questionText: '发货快递',
    answerText: '订单付款后四十八小时内发出，物流单号同步到订单页。',
    category: 'presale',
  }),
  Object.freeze({
    scriptId: 'eta',
    title: '到货时效',
    questionText: '到货时效',
    answerText: '一般三到五天送达，偏远地区可能更久。',
    category: 'presale',
  }),
  Object.freeze({
    scriptId: 'address',
    title: '改地址',
    questionText: '改地址',
    answerText: '未发货前可以修改一次收货地址。',
    category: 'presale',
  }),
  Object.freeze({
    scriptId: 'mask',
    title: '面膜适用人群',
    questionText: '面膜适用人群',
    answerText: '敏感肌也能用，建议先在耳后试用。',
    category: 'product',
  }),
]);

describe('hybrid retrieve ranking', () => {
  it('ranks a shipping sentence onto shipping titles, not address', () => {
    const ranked = rankScripts('什么时候发货啊', corpus);
    expect(ranked[0]?.title).toMatch(/发货|时效/);
    expect(ranked[0]?.title).not.toBe('改地址');
  });

  it('ranks a skin-use sentence onto the mask script', () => {
    const ranked = rankScripts('这款面膜敏感肌可以用吗', corpus);
    expect(ranked[0]?.title).toBe('面膜适用人群');
  });

  it('ranks an address-change sentence onto 改地址', () => {
    const ranked = rankScripts('我填错地址了能不能改', corpus);
    expect(ranked[0]?.title).toBe('改地址');
  });
});

describe('query analysis slots', () => {
  it('labels shipping and address without picking a script id', () => {
    expect(analyzeQuery('什么时候发货').domain).toBe('shipping');
    expect(analyzeQuery('我地址填错了').domain).toBe('address');
    expect(analyzeQuery('敏感肌能用吗').domain).toBe('product');
  });
});
