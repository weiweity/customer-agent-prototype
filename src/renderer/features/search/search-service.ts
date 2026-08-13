import { MAX_QUERY_CHARS } from '@shared/contracts';
import { SYNTHETIC_SCRIPTS } from '../../data/synthetic-scripts';
import type {
  RankedScript,
  ScriptFixture,
  SearchOutcome,
} from './types';

export const MIN_HIT_SCORE = 38;
export const MAX_RESULTS = 3;

const STOP_TOKENS = new Set([
  '怎么',
  '如何',
  '什么',
  '请问',
  '可以',
  '是否',
  '一下',
  '帮我',
  '我想',
  '问下',
  '吗',
  '呢',
  '啊',
  '的',
  '了',
  '么',
]);

type QueryFeatures = {
  normalized: string;
  coreOrNormalized: string;
  compact: string;
  compactLen: number;
  tokens: string[];
  bigrams: string[];
  trigrams: string[];
};

export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripStopTokens(text: string): string {
  let next = text;
  for (const token of STOP_TOKENS) {
    next = next.replaceAll(token, ' ');
  }
  return next.replace(/\s+/g, ' ').trim();
}

function tokensOf(text: string): string[] {
  const parts = text.split(' ').filter((part) => part.length >= 2);
  const extras: string[] = [];
  for (const part of parts) {
    if (/[\u4e00-\u9fff]/.test(part) && part.length >= 2) {
      extras.push(part);
    }
  }
  return [...parts, ...extras];
}

function ngrams(text: string, size: number): string[] {
  const compact = text.replace(/\s+/g, '');
  if (compact.length < size) {
    return compact.length > 0 ? [compact] : [];
  }
  const grams: string[] = [];
  for (let i = 0; i <= compact.length - size; i += 1) {
    grams.push(compact.slice(i, i + size));
  }
  return grams;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const left = new Set(a);
  const right = new Set(b);
  let inter = 0;
  for (const item of left) {
    if (right.has(item)) {
      inter += 1;
    }
  }
  return inter / (left.size + right.size - inter);
}

function recall(needles: string[], haystack: string[]): number {
  if (needles.length === 0) {
    return 0;
  }
  const pool = new Set(haystack);
  let hit = 0;
  for (const item of needles) {
    if (pool.has(item)) {
      hit += 1;
    }
  }
  return hit / needles.length;
}

function longestCommonSubstring(leftCompact: string, rightText: string): number {
  const right = rightText.replace(/\s+/g, '');
  if (!leftCompact || !right) {
    return 0;
  }
  const table: number[] = new Array(right.length + 1).fill(0);
  let best = 0;
  for (let i = 1; i <= leftCompact.length; i += 1) {
    let prev = 0;
    for (let j = 1; j <= right.length; j += 1) {
      const stored = table[j];
      if (leftCompact[i - 1] === right[j - 1]) {
        table[j] = prev + 1;
        if (table[j] > best) {
          best = table[j];
        }
      } else {
        table[j] = 0;
      }
      prev = stored;
    }
  }
  return best;
}

function buildQueryFeatures(normalizedQuery: string): QueryFeatures {
  const queryCore = stripStopTokens(normalizedQuery);
  const coreOrNormalized = queryCore || normalizedQuery;
  return {
    normalized: normalizedQuery,
    coreOrNormalized,
    compact: coreOrNormalized.replace(/\s+/g, ''),
    compactLen: Math.max(coreOrNormalized.replace(/\s+/g, '').length, 1),
    tokens: tokensOf(queryCore),
    bigrams: unique(ngrams(coreOrNormalized, 2).filter((gram) => !STOP_TOKENS.has(gram))),
    trigrams: unique(ngrams(coreOrNormalized, 3)),
  };
}

function scoreAgainstVariant(features: QueryFeatures, variant: string): number {
  const normalizedVariant = normalizeQuery(variant);
  if (!normalizedVariant) {
    return 0;
  }

  if (features.normalized === normalizedVariant) {
    return 100;
  }

  let substring = 0;
  if (features.normalized.length >= 4 && normalizedVariant.includes(features.normalized)) {
    substring = 70 + 25 * (features.normalized.length / normalizedVariant.length);
  } else if (
    normalizedVariant.length >= 4 &&
    features.normalized.includes(normalizedVariant)
  ) {
    substring = 62 + 20 * (normalizedVariant.length / features.normalized.length);
  }

  const variantCore = stripStopTokens(normalizedVariant);
  const variantCoreOrNormalized = variantCore || normalizedVariant;
  const variantBigrams = unique(ngrams(variantCoreOrNormalized, 2));
  const variantTrigrams = unique(ngrams(variantCoreOrNormalized, 3));

  const bigramRecall = recall(features.bigrams, variantBigrams);
  const trigramRecall = recall(features.trigrams, variantTrigrams);
  const tokenScore = jaccard(features.tokens, tokensOf(variantCore)) * 20;
  const lcs = longestCommonSubstring(features.compact, variantCoreOrNormalized);
  const lcsScore = Math.min(lcs / features.compactLen, 1) * 28;

  const fuzzy = bigramRecall * 32 + trigramRecall * 22 + tokenScore + lcsScore;
  const score = Math.max(substring, fuzzy);
  return Math.min(99, Math.round(score * 10) / 10);
}

function scoreScriptWithFeatures(features: QueryFeatures, script: ScriptFixture): number {
  let best = 0;
  for (const variant of script.questionVariants) {
    const next = scoreAgainstVariant(features, variant);
    if (next > best) {
      best = next;
    }
    if (best === 100) {
      break;
    }
  }
  return best;
}

export function scoreScript(query: string, script: ScriptFixture): number {
  if (query.length > MAX_QUERY_CHARS) {
    return 0;
  }
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return 0;
  }
  return scoreScriptWithFeatures(buildQueryFeatures(normalizedQuery), script);
}

export function searchScripts(
  query: string,
  scripts: readonly ScriptFixture[] = SYNTHETIC_SCRIPTS,
): SearchOutcome {
  if (query.length > MAX_QUERY_CHARS) {
    return { status: 'invalid', reason: 'too-long' };
  }

  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return { status: 'no-hit' };
  }

  const features = buildQueryFeatures(normalizedQuery);
  const ranked = scripts
    .map((script) => ({
      script,
      score: scoreScriptWithFeatures(features, script),
    }))
    .filter((item) => item.score >= MIN_HIT_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.script.scriptId.localeCompare(b.script.scriptId);
    })
    .slice(0, MAX_RESULTS);

  if (ranked.length === 0) {
    return { status: 'no-hit' };
  }

  const results: RankedScript[] = ranked.map((item, index) => ({
    scriptId: item.script.scriptId,
    domain: item.script.domain,
    questionVariants: item.script.questionVariants,
    answerText: item.script.answerText,
    platform: item.script.platform,
    scopeLabel: item.script.scopeLabel,
    riskLevel: item.script.riskLevel,
    effectiveFrom: item.script.effectiveFrom,
    effectiveTo: item.script.effectiveTo,
    rank: (index + 1) as 1 | 2 | 3,
    score: item.score,
  }));

  return { status: 'hit', results };
}
