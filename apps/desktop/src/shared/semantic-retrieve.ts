/**
 * Local sentence-to-script ranking used before the frozen `/v1/search` judge.
 *
 * The HTTP search still owns display, scope and copy provenance. This module
 * only picks likely titles so a natural-language sentence can be rewritten
 * into a query the judge will accept. Corpus files stay outside git.
 */

export type RetrievalScript = Readonly<{
  scriptId: string;
  title: string;
  questionText: string;
  answerText: string;
}>;

export type RankedRetrieval = RetrievalScript & Readonly<{ score: number }>;

const FUNCTION_WORDS = Object.freeze([
  '难道不是', '是不是', '对不对', '哪一方', '什么时候', '怎么办',
  '请问', '是否', '对吗', '是吗', '怎样', '如何', '哪些', '哪个', '什么', '多少',
  '怎么', '一下', '已经', '以后', '之后', '还会', '还是', '还能', '需要',
  '应该', '可以', '这款', '这个', '那个', '哪里', '时候', '麻烦', '您好', '你好',
  '多久', '帮我', '请问一下',
  '吗', '呢', '啊', '吧', '嘛', '的', '了', '还', '能', '在', '谁',
  '后', '要', '才', '有', '是', '会', '到', '与', '和', '或', '由', '向', '给',
]);

const MIN_SCORE = 0.22;
const DEFAULT_LIMIT = 3;

export function compactSearchText(value: string): string {
  return Array.from(value.normalize('NFKC').toLowerCase())
    .join('')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function stripFunctionWords(compact: string): string {
  let remainder = compact;
  const words = [...FUNCTION_WORDS].sort((left, right) => right.length - left.length);
  for (const word of words) remainder = remainder.replaceAll(word, '');
  return remainder;
}

function bigrams(compact: string): readonly string[] {
  const chars = Array.from(compact);
  if (chars.length === 0) return Object.freeze([]);
  if (chars.length === 1) return Object.freeze(chars);
  const grams: string[] = [];
  for (let index = 0; index + 1 < chars.length; index += 1) {
    grams.push(`${chars[index]}${chars[index + 1]}`);
  }
  return Object.freeze(grams);
}

function coverage(needle: string, haystack: string): number {
  if (needle.length === 0) return 0;
  const chars = Array.from(needle);
  let hits = 0;
  for (const char of chars) if (haystack.includes(char)) hits += 1;
  return hits / chars.length;
}

function gramHits(queryGrams: readonly string[], haystackGrams: ReadonlySet<string>): number {
  if (queryGrams.length === 0) return 0;
  let hits = 0;
  for (const gram of queryGrams) if (haystackGrams.has(gram)) hits += 1;
  return hits / queryGrams.length;
}

export function scoreDocument(query: string, script: RetrievalScript): number {
  const queryCompact = compactSearchText(query);
  const stripped = stripFunctionWords(queryCompact);
  const title = compactSearchText(script.title);
  const question = compactSearchText(script.questionText);
  const answer = compactSearchText(script.answerText);
  const head = `${title}${question}`;
  const blob = `${head}${answer}`;
  if (queryCompact.length === 0 && stripped.length === 0) return 0;
  if (title === queryCompact || question === queryCompact) return 1;
  if (queryCompact.length >= 2 && (title === queryCompact || question === queryCompact
    || title.startsWith(queryCompact) && title.length <= queryCompact.length + 2
    || question.startsWith(queryCompact) && question.length <= queryCompact.length + 2)) return 0.97;
  if (stripped.length >= 2 && (title === stripped || question === stripped)) return 0.95;
  if (stripped.length >= 2 && title.startsWith(stripped) && title.length <= stripped.length + 2) return 0.92;
  if (stripped.length >= 2 && title.length >= 2 && stripped.includes(title) && title.length >= stripped.length - 1) return 0.9;
  const focus = stripped.length >= 2 ? stripped : queryCompact;
  const queryGrams = bigrams(focus);
  const headGrams = new Set(bigrams(head));
  const answerGrams = new Set(bigrams(answer));
  const headRatio = gramHits(queryGrams, headGrams);
  const answerRatio = gramHits(queryGrams, answerGrams);
  const titleRecall = gramHits(bigrams(title), new Set(queryGrams));
  const covered = coverage(focus, blob);
  const negated = focus.length >= 2
    && (answer.includes(`未${focus}`) || answer.includes(`不${focus}`) || answer.includes(`没${focus}`));
  const phraseHit = focus.length >= 2 && (head.includes(focus) || (answer.includes(focus) && !negated));
  const phraseBonus = phraseHit ? 0.18 : 0;
  const intent = intentBoost(query, blob);
  const raw = headRatio * 0.5 + titleRecall * 0.32 + answerRatio * 0.12 + covered * 0.08 + phraseBonus + intent;
  if (headRatio === 0 && titleRecall === 0 && intent === 0) return Math.min(0.36, raw * 0.55);
  return Math.min(0.89, raw);
}

function intentBoost(query: string, blob: string): number {
  let boost = 0;
  if (/什么时候|多久|几天|几点|时效/u.test(query) && /时效|小时|发出|送达|几天/u.test(blob)) boost += 0.2;
  if (/哪家|什么快递|用什么快递/u.test(query) && /快递/u.test(blob)) boost += 0.18;
  if (/地址|改址/u.test(query) && /地址/u.test(blob)) boost += 0.18;
  if (/敏感|适用人群|能用吗|可以用/u.test(query) && /适用人群|敏感肌|敏感/u.test(blob)) boost += 0.22;
  if (/敏感|能用|适用/u.test(query) && /适用人群/u.test(blob)) boost += 0.12;
  return boost;
}

export function rankScripts(
  query: string,
  scripts: readonly RetrievalScript[],
  limit = DEFAULT_LIMIT,
): readonly RankedRetrieval[] {
  const ranked = scripts
    .map((script) => Object.freeze({ ...script, score: scoreDocument(query, script) }))
    .filter((row) => row.score >= MIN_SCORE)
    .sort((left, right) => right.score - left.score || left.scriptId.localeCompare(right.scriptId));
  const unique: RankedRetrieval[] = [];
  const titles = new Set<string>();
  for (const row of ranked) {
    if (titles.has(row.title)) continue;
    titles.add(row.title);
    unique.push(row);
    if (unique.length >= limit) break;
  }
  return Object.freeze(unique);
}
