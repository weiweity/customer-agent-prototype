import { MAX_QUERY_CHARS } from '@shared/contracts';

type QuestionInputProps = {
  value: string;
  disabled: boolean;
  searching: boolean;
  shortcutLabel: string;
  onChange: (value: string) => void;
  onSearch: () => void;
};

export function QuestionInput({
  value,
  disabled,
  searching,
  shortcutLabel,
  onChange,
  onSearch,
}: QuestionInputProps) {
  return (
    <section className="question-block">
      <label className="field-label" htmlFor="customer-question">
        客户问题
      </label>
      <div className="textarea-wrap">
        <textarea
          id="customer-question"
          className="question-input"
          data-testid="question-input"
          value={value}
          disabled={disabled}
          maxLength={MAX_QUERY_CHARS}
          rows={4}
          placeholder="粘贴客户原话，查找可复制的合成话术原文"
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="clear-btn"
          data-testid="clear-button"
          disabled={disabled || value.length === 0}
          onClick={() => onChange('')}
        >
          清空
        </button>
      </div>
      <div className="search-row">
        <button
          type="button"
          className="primary-btn"
          data-testid="search-button"
          disabled={searching}
          onClick={onSearch}
        >
          {searching ? '正在查找…' : '查找话术'}
        </button>
        <span className="shortcut-note">{shortcutLabel}</span>
      </div>
    </section>
  );
}
