import type { ToastState } from './toast-state';

type ToastProps = {
  toast: ToastState;
  onRetry?: () => void;
  onDismiss: () => void;
};

export function Toast({ toast, onRetry, onDismiss }: ToastProps) {
  return (
    <div className="toast-region" data-testid="toast-region">
      <div className={toast.kind === 'success' ? 'toast is-success' : 'toast is-error'}>
        <p
          className="toast-message"
          data-testid="toast"
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </p>
        <div className="toast-actions">
          {toast.kind === 'error' && onRetry ? (
            <button type="button" className="toast-retry" onClick={onRetry}>
              重试
            </button>
          ) : null}
          <button
            type="button"
            className="toast-close"
            data-testid="toast-close"
            onClick={onDismiss}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
