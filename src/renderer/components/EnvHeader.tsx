type EnvHeaderProps = {
  connectionLabel: string;
};

export function EnvHeader({ connectionLabel }: EnvHeaderProps) {
  return (
    <header className="app-header">
      <div className="header-row">
        <h1 className="product-name">客服话术工作台</h1>
        <p className="connection-status" data-testid="connection-status">
          <span className="status-dot" aria-hidden="true" />
          <span>{connectionLabel}</span>
        </p>
      </div>
      <div className="env-badges" data-testid="env-badges">
        <span className="env-badge">DEMO</span>
        <span className="env-badge">MOCK AUTH</span>
        <span className="env-badge">SYNTHETIC DATA</span>
      </div>
    </header>
  );
}
