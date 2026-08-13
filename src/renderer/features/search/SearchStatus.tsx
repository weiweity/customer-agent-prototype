import { EXAMPLE_QUESTIONS } from '../../data/synthetic-scripts';

type SearchStatusProps = {
  phase: 'idle' | 'searching' | 'no-hit' | 'invalid';
  invalidMessage?: string;
  onFillExample: (question: string) => void;
};

export function SearchStatus({ phase, invalidMessage, onFillExample }: SearchStatusProps) {
  if (phase === 'searching') {
    return (
      <div className="skeleton-list" data-testid="search-loading" aria-busy="true">
        <p className="status-copy">正在本地合成话术库中检索，不会生成自由回答。</p>
        {[0, 1, 2].map((item) => (
          <div className="skeleton-card" key={item}>
            <div className="skeleton-line is-short" />
            <div className="skeleton-line is-wide" />
            <div className="skeleton-line is-mid" />
          </div>
        ))}
      </div>
    );
  }

  if (phase === 'no-hit') {
    return (
      <div className="status-banner no-hit" data-testid="no-hit">
        <strong>未找到可用话术</strong>
        <span>
          可转人工话术师，或查看飞书源中的正式条目。当前 Demo 未接通真实飞书、工单或话术库，请不要把这次结果当成线上结论。
        </span>
      </div>
    );
  }

  if (phase === 'invalid') {
    return (
      <p className="validation-error" data-testid="validation-error">
        {invalidMessage ?? '请先输入客户问题'}
      </p>
    );
  }

  return (
    <div className="examples" data-testid="idle-examples">
      <p className="examples-title">从合成话术库查找可复制原文。可点选示例问题：</p>
      <div className="example-list">
        {EXAMPLE_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            className="example-btn"
            onClick={() => onFillExample(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
