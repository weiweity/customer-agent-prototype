type QuestionSummaryProps = {
  query: string;
  onEdit: () => void;
};

export function QuestionSummary({ query, onEdit }: QuestionSummaryProps) {
  return (
    <section className="question-summary" data-testid="question-summary">
      <div className="question-summary-copy">
        <span className="field-label">当前问题</span>
        <p className="question-summary-text" title={query}>
          {query}
        </p>
      </div>
      <button
        type="button"
        className="edit-question-btn"
        data-testid="edit-question-button"
        onClick={onEdit}
      >
        修改问题 / 重新查找
      </button>
    </section>
  );
}
