import type { RecentFact } from './facts';

type RecentPanelProps = {
  facts: RecentFact[];
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function outcomeLabel(fact: RecentFact): string {
  if (fact.outcome === 'no-hit') {
    return '无命中';
  }
  if (fact.outcome === 'copied' && fact.selectedRank) {
    return `已复制第 ${fact.selectedRank} 条`;
  }
  return `返回 ${fact.resultCount} 条`;
}

export function RecentPanel({ facts }: RecentPanelProps) {
  if (facts.length === 0) {
    return (
      <div className="recent-empty" data-testid="recent-empty">
        仅保留本次 Demo 会话中的可证明事实。重启后清空，不会写入本地文件或浏览器存储。
      </div>
    );
  }

  return (
    <ul className="recent-list" data-testid="recent-list">
      {facts.map((fact) => (
        <li className="recent-item" key={fact.id}>
          <div className="recent-top">
            <span className="recent-time">{formatTime(fact.occurredAt)}</span>
            <span className="recent-id">{fact.scriptId ?? '—'}</span>
          </div>
          <p className="recent-preview">{fact.queryPreview || '（空摘要）'}</p>
          <p className="recent-meta">
            结果 {fact.resultCount} 条 · {outcomeLabel(fact)}
          </p>
        </li>
      ))}
    </ul>
  );
}
