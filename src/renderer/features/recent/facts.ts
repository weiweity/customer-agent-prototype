import { createQueryPreview } from './mask';

export type RecentOutcome = 'shown' | 'no-hit' | 'copied';

export type RecentFact = {
  id: string;
  occurredAt: string;
  queryPreview: string;
  resultCount: number;
  outcome: RecentOutcome;
  selectedRank: 1 | 2 | 3 | null;
  scriptId: string | null;
};

export const RECENT_FACT_KEYS = [
  'id',
  'occurredAt',
  'queryPreview',
  'resultCount',
  'outcome',
  'selectedRank',
  'scriptId',
] as const satisfies readonly (keyof RecentFact)[];

let factSeq = 0;

export function createSearchFact(input: {
  query: string;
  resultCount: number;
  outcome: Extract<RecentOutcome, 'shown' | 'no-hit'>;
  now?: Date;
  id?: string;
}): RecentFact {
  factSeq += 1;
  return {
    id: input.id ?? `fact-${input.now?.getTime() ?? Date.now()}-${factSeq}`,
    occurredAt: (input.now ?? new Date()).toISOString(),
    queryPreview: createQueryPreview(input.query),
    resultCount: input.resultCount,
    outcome: input.outcome,
    selectedRank: null,
    scriptId: null,
  };
}

export function createCopyFact(input: {
  query: string;
  resultCount: number;
  selectedRank: 1 | 2 | 3;
  scriptId: string;
  now?: Date;
  id?: string;
}): RecentFact {
  factSeq += 1;
  return {
    id: input.id ?? `fact-${input.now?.getTime() ?? Date.now()}-${factSeq}`,
    occurredAt: (input.now ?? new Date()).toISOString(),
    queryPreview: createQueryPreview(input.query),
    resultCount: input.resultCount,
    outcome: 'copied',
    selectedRank: input.selectedRank,
    scriptId: input.scriptId,
  };
}

export function prependFact(list: RecentFact[], fact: RecentFact): RecentFact[] {
  return [fact, ...list].slice(0, 40);
}
