// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createRetrievalPipeline } from '../../src/main/retrieval-pipeline';
import type { RetrievalScript } from '../../src/shared/hybrid-retrieve';

const scripts: RetrievalScript[] = [
  { scriptId: 'ship', title: '发货时效', questionText: '什么时候发货', answerText: '48小时内发出', questions: ['几天能到'] },
  { scriptId: 'nudge', title: '催发货', questionText: '怎么还不发', answerText: '仓库正在处理' },
  { scriptId: 'addr', title: '改地址', questionText: '地址填错了', answerText: '未发货可改' },
];

describe('retrieval pipeline', () => {
  it('skips MiniMax when smart retrieval is off', async () => {
    let planned = 0;
    const pipeline = createRetrievalPipeline(scripts, {
      fetchImpl: (async () => {
        planned += 1;
        return new Response('{}', { status: 500 });
      }) as typeof fetch,
    });
    const ranked = await pipeline.run('什么时候发货', false);
    expect(planned).toBe(0);
    expect(ranked[0]?.title).toMatch(/发货|时效/);
  });

  it('uses planned queries then reranks ids only', async () => {
    process.env.MINIMAX_API_KEY = 'test-key';
    try {
      const prompts: string[] = [];
      const pipeline = createRetrievalPipeline(scripts, {
        fetchImpl: (async (_url, init) => {
          const body = JSON.parse(String((init as RequestInit).body));
          const prompt = String(body.messages?.[1]?.content ?? '');
          prompts.push(prompt);
          if (prompt.includes('顾客问句：什么时候发货') && !prompt.includes('候选：')) {
            return new Response(JSON.stringify({
              choices: [{ message: { content: '{"intent":"shipping","queries":["发货时效"]}' } }],
            }), { status: 200 });
          }
          return new Response(JSON.stringify({
            choices: [{ message: { content: '{"ids":["ship","addr"]}' } }],
          }), { status: 200 });
        }) as typeof fetch,
      });
      const ranked = await pipeline.run('什么时候发货', true);
      expect(ranked.map((row) => row.scriptId)[0]).toBe('ship');
      expect(prompts.join('\n')).not.toContain('48小时内发出');
      expect(prompts.join('\n')).not.toContain('仓库正在处理');
    } finally {
      delete process.env.MINIMAX_API_KEY;
    }
  });
});
