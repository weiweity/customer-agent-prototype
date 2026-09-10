/**
 * MiniMax reranks BM25+RRF candidates. It must return existing script ids only
 * and never generate answer text. Missing key or timeout falls back to BM25 order.
 *
 * Official OpenAI-compatible API: https://api.minimaxi.com/v1/chat/completions
 * (intl: https://api.minimax.io/v1). M3 thinking is disabled for latency.
 *
 * Electron main uses Chromium `net.fetch` so macOS trusts WoTrus/USERTrust;
 * Node's Mozilla CA bundle does not, and undici fetch would silently fall back.
 */
import { createRequire } from 'node:module';
import type { RankedRetrieval } from '../shared/hybrid-retrieve';

export type Reranker = Readonly<{
  rerank(query: string, ranked: readonly RankedRetrieval[]): Promise<readonly RankedRetrieval[]>;
}>;

export type MinimaxRerankerOptions = Readonly<{
  fetchImpl?: typeof fetch;
}>;

function electronFetch(): typeof fetch | null {
  try {
    const electron = createRequire(import.meta.url)('electron') as { net?: { fetch?: typeof fetch } };
    return typeof electron.net?.fetch === 'function' ? electron.net.fetch.bind(electron.net) : null;
  } catch {
    return null;
  }
}

const DEFAULT_BASE = 'https://api.minimaxi.com/v1';
const DEFAULT_MODEL = 'MiniMax-M3';
const TIMEOUT_MS = 2500;
const TOP_N = 8;

export function parseRerankIds(raw: string, allowed: readonly string[]): string[] {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return [];
  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
    const ids = parsed && typeof parsed === 'object' ? Reflect.get(parsed, 'ids') : undefined;
    if (!Array.isArray(ids)) return [];
    const allow = new Set(allowed);
    const out: string[] = [];
    for (const id of ids) {
      if (typeof id !== 'string' || !allow.has(id) || out.includes(id)) continue;
      out.push(id);
    }
    return out;
  } catch {
    return [];
  }
}

function mergeOrder(preferred: readonly string[], ranked: readonly RankedRetrieval[]): RankedRetrieval[] {
  const byId = new Map(ranked.map((row) => [row.scriptId, row]));
  const out: RankedRetrieval[] = [];
  for (const id of preferred) {
    const row = byId.get(id);
    if (!row) continue;
    out.push(row);
    byId.delete(id);
  }
  for (const row of ranked) if (byId.has(row.scriptId)) out.push(row);
  return out;
}

export function loadMinimaxReranker(options: MinimaxRerankerOptions = {}): Reranker | null {
  const apiKey = process.env.MINIMAX_API_KEY?.trim();
  if (!apiKey) return null;
  const base = (process.env.MINIMAX_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.MINIMAX_MODEL?.trim() || DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? electronFetch() ?? fetch;
  return Object.freeze({
    async rerank(query: string, ranked: readonly RankedRetrieval[]) {
      if (ranked.length <= 1) return ranked;
      const slice = ranked.slice(0, TOP_N);
      const allowed = slice.map((row) => row.scriptId);
      const payload = {
        model,
        temperature: 0.1,
        max_tokens: 200,
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'system',
            content: '你是护肤品电商客服话术检索重排器。只根据顾客问句给已有候选排序。必须只输出 JSON：{"ids":["scriptId"...]}。禁止改写或生成话术正文。',
          },
          {
            role: 'user',
            content: `顾客问句：${query}\n候选：\n${slice.map((row, index) => `${index + 1}. ${row.scriptId} | ${row.title} | ${row.answerText.slice(0, 80)}`).join('\n')}`,
          },
        ],
      };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetchImpl(`${base}/chat/completions`, {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!response.ok) return ranked;
        const body: unknown = await response.json().catch(() => ({}));
        const content = (body as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content;
        if (typeof content !== 'string') return ranked;
        const ids = parseRerankIds(content, allowed);
        if (ids.length === 0) return ranked;
        console.log('[minimax-rerank] ok');
        return Object.freeze(mergeOrder(ids, ranked));
      } catch (error) {
        const detail = error instanceof Error ? error.name : 'error';
        console.warn(`[minimax-rerank] fallback ${detail}`);
        return ranked;
      } finally {
        clearTimeout(timer);
      }
    },
  });
}
