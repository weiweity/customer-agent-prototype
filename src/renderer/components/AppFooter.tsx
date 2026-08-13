import type { AppView } from './view-types';

type AppFooterProps = {
  view: AppView;
  onViewChange: (view: AppView) => void;
  shortcutLabel: string;
};

export function AppFooter({ view, onViewChange, shortcutLabel }: AppFooterProps) {
  return (
    <footer className="app-footer">
      <div className="view-tabs" role="tablist" aria-label="视图切换">
        <button
          type="button"
          role="tab"
          className={view === 'search' ? 'view-tab is-active' : 'view-tab'}
          aria-selected={view === 'search'}
          onClick={() => onViewChange('search')}
        >
          话术浮窗
        </button>
        <button
          type="button"
          role="tab"
          className={view === 'recent' ? 'view-tab is-active' : 'view-tab'}
          aria-selected={view === 'recent'}
          onClick={() => onViewChange('recent')}
        >
          近期记录
        </button>
      </div>
      <p className="keyboard-hint">{shortcutLabel}</p>
    </footer>
  );
}
