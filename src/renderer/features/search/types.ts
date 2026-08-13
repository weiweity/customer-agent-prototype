export type RiskLevel = 'low' | 'medium' | 'high';

export type ScriptDomain = '产品' | '活动' | '售前' | '售后';

export type ScriptFixture = {
  scriptId: string;
  domain: ScriptDomain;
  questionVariants: string[];
  answerText: string;
  platform: string;
  scopeLabel: string;
  riskLevel: RiskLevel;
  effectiveFrom: string;
  effectiveTo: string;
};

export type RankedScript = ScriptFixture & {
  rank: 1 | 2 | 3;
  score: number;
};

export type SearchOutcome =
  | { status: 'hit'; results: RankedScript[] }
  | { status: 'no-hit' }
  | { status: 'invalid'; reason: 'too-long' };
