import { useState } from 'react';
import { getValidityInfo } from './validity';
import type { RankedScript, RiskLevel } from './types';

type ScriptCardProps = {
  script: RankedScript;
  copying: boolean;
  onCopy: (script: RankedScript, trigger: HTMLButtonElement | null) => void;
};

const RISK_COPY: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: '低风险', className: 'risk-chip' },
  medium: { label: '需人工核对', className: 'risk-chip is-medium' },
  high: { label: '高风险 · 需复核', className: 'risk-chip is-high' },
};

export function ScriptCard({ script, copying, onCopy }: ScriptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const validity = getValidityInfo(script.effectiveFrom, script.effectiveTo);
  const risk = RISK_COPY[script.riskLevel];

  return (
    <article
      className={script.riskLevel === 'high' ? 'script-card is-high' : 'script-card'}
      data-testid={`script-card-${script.rank}`}
    >
      <div className="card-top">
        <div className="rank-score">
          <span className="rank">{script.rank}</span>
          <span className="score">匹配分 {Math.round(script.score)}</span>
        </div>
        <div className="card-top-tags">
          <span className={risk.className} data-testid={`risk-${script.rank}`}>
            {risk.label}
          </span>
          <span className="synthetic-tag">合成</span>
        </div>
      </div>
      <p
        className={expanded ? 'answer-text' : 'answer-text is-clamped'}
        data-testid={`answer-text-${script.rank}`}
      >
        {script.answerText}
      </p>
      {expanded ? (
        <div className="meta-row">
          <span className="meta-chip">{script.domain}</span>
          <span className="meta-chip">{script.platform}</span>
          <span className="meta-chip">{script.scopeLabel}</span>
          <span className={`validity-chip is-${validity.kind}`}>{validity.text}</span>
        </div>
      ) : (
        <p className="meta-line">
          {script.domain} · {risk.label} · {validity.text}
        </p>
      )}
      <div className="card-actions">
        <button
          type="button"
          className="expand-btn"
          data-testid={`expand-button-${script.rank}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? '收起' : '展开全文'}
        </button>
        <button
          type="button"
          className="copy-btn"
          data-testid={`copy-button-${script.rank}`}
          disabled={copying}
          onClick={(event) => onCopy(script, event.currentTarget)}
        >
          复制话术
        </button>
        <span className="copy-hotkey">快捷键 {script.rank}</span>
      </div>
    </article>
  );
}
