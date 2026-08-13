import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COPY_SUCCESS_MESSAGE,
  MAX_QUERY_CHARS,
  QUERY_TOO_LONG_MESSAGE,
} from '@shared/contracts';
import { AppFooter } from './components/AppFooter';
import { EnvHeader } from './components/EnvHeader';
import { Toast } from './components/Toast';
import type { ToastState } from './components/toast-state';
import type { AppView } from './components/view-types';
import { createCopyFact, createSearchFact, prependFact, type RecentFact } from './features/recent/facts';
import { RecentPanel } from './features/recent/RecentPanel';
import { QuestionInput } from './features/search/QuestionInput';
import { QuestionSummary } from './features/search/QuestionSummary';
import { ScriptCard } from './features/search/ScriptCard';
import { SearchStatus } from './features/search/SearchStatus';
import { searchScripts } from './features/search/search-service';
import type { RankedScript } from './features/search/types';
import { delay } from './lib/delay';
import { isInteractiveTarget } from './lib/is-interactive-target';

export const SEARCH_DELAY_MS = 180;

type SearchPhase = 'idle' | 'searching' | 'results' | 'no-hit' | 'invalid' | 'editing';

function modifierLabel(platform: string): string {
  return platform === 'darwin' ? '⌘' : 'Ctrl';
}

export function App() {
  const [view, setView] = useState<AppView>('search');
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [results, setResults] = useState<RankedScript[]>([]);
  const [facts, setFacts] = useState<RecentFact[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [copying, setCopying] = useState(false);
  const [pendingCopy, setPendingCopy] = useState<RankedScript | null>(null);
  const [platform, setPlatform] = useState('win32');
  const [invalidMessage, setInvalidMessage] = useState('请先输入客户问题');
  const lastCopyButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchInFlightRef = useRef(false);
  const searchTokenRef = useRef(0);
  const copyInFlightRef = useRef(false);
  const copyTokenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const api = window.customerAgent;
    if (!api) {
      return;
    }
    void api
      .getPlatform()
      .then((info) => {
        if (!cancelled && info.platform) {
          setPlatform(info.platform);
        }
      })
      .catch(() => {
        // Keep the Windows-first default; never surface an unhandled rejection.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchShortcut = `${modifierLabel(platform)} + Enter`;
  const footerHint = `${searchShortcut} 查找 · 1/2/3 复制 · Esc 关闭提示`;

  const dismissToast = useCallback(() => {
    setToast(null);
    window.requestAnimationFrame(() => {
      lastCopyButtonRef.current?.focus();
    });
  }, []);

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setPhase('invalid');
      setResults([]);
      setInvalidMessage('请先输入客户问题');
      return;
    }

    if (query.length > MAX_QUERY_CHARS) {
      setPhase('invalid');
      setResults([]);
      setInvalidMessage(QUERY_TOO_LONG_MESSAGE);
      return;
    }

    if (searchInFlightRef.current) {
      return;
    }
    searchInFlightRef.current = true;
    const token = searchTokenRef.current + 1;
    searchTokenRef.current = token;

    setPhase('searching');
    setToast(null);

    try {
      await delay(SEARCH_DELAY_MS);
      if (token !== searchTokenRef.current) {
        return;
      }

      const outcome = searchScripts(trimmed);
      if (token !== searchTokenRef.current) {
        return;
      }

      if (outcome.status === 'invalid') {
        setResults([]);
        setPhase('invalid');
        setInvalidMessage(QUERY_TOO_LONG_MESSAGE);
        return;
      }

      if (outcome.status === 'no-hit') {
        setResults([]);
        setPhase('no-hit');
        setFacts((current) =>
          prependFact(
            current,
            createSearchFact({ query: trimmed, resultCount: 0, outcome: 'no-hit' }),
          ),
        );
        return;
      }

      setResults(outcome.results);
      setPhase('results');
      setFacts((current) =>
        prependFact(
          current,
          createSearchFact({
            query: trimmed,
            resultCount: outcome.results.length,
            outcome: 'shown',
          }),
        ),
      );
    } finally {
      if (token === searchTokenRef.current) {
        searchInFlightRef.current = false;
      }
    }
  }, [query]);

  const copyScript = useCallback(
    async (script: RankedScript, trigger: HTMLButtonElement | null = null) => {
      if (copyInFlightRef.current) {
        return;
      }
      copyInFlightRef.current = true;
      const token = copyTokenRef.current + 1;
      copyTokenRef.current = token;

      lastCopyButtonRef.current =
        trigger ??
        document.querySelector<HTMLButtonElement>(`[data-testid="copy-button-${script.rank}"]`);

      const api = window.customerAgent;
      if (!api) {
        if (token === copyTokenRef.current) {
          setPendingCopy(script);
          setToast({
            kind: 'error',
            message: '复制通道不可用，请在桌面 Demo 中重试',
          });
          copyInFlightRef.current = false;
        }
        return;
      }

      setCopying(true);
      setPendingCopy(script);
      try {
        const result = await api.copyText(script.answerText);
        if (token !== copyTokenRef.current) {
          return;
        }
        if (result.ok) {
          setToast({ kind: 'success', message: COPY_SUCCESS_MESSAGE });
          setFacts((current) =>
            prependFact(
              current,
              createCopyFact({
                query,
                resultCount: results.length,
                selectedRank: script.rank,
                scriptId: script.scriptId,
              }),
            ),
          );
          return;
        }
        setToast({
          kind: 'error',
          message: result.message || '复制失败，请重试',
        });
      } catch {
        if (token !== copyTokenRef.current) {
          return;
        }
        setToast({ kind: 'error', message: '复制失败，请重试' });
      } finally {
        if (token === copyTokenRef.current) {
          copyInFlightRef.current = false;
          setCopying(false);
        }
      }
    },
    [query, results.length],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (toast) {
          event.preventDefault();
          dismissToast();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void runSearch();
        return;
      }

      if (
        view !== 'search' ||
        phase !== 'results' ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      if (event.key === '1' || event.key === '2' || event.key === '3') {
        const index = Number(event.key) - 1;
        const script = results[index];
        if (script) {
          event.preventDefault();
          void copyScript(script);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [copyScript, dismissToast, phase, results, runSearch, toast, view]);

  const statusPhase = useMemo(() => {
    if (phase === 'results' || phase === 'editing') {
      return null;
    }
    return phase;
  }, [phase]);

  return (
    <div className="app-shell">
      <EnvHeader connectionLabel="本地离线 · 未连接生产" />
      <main className="app-main">
        {view === 'search' ? (
          <>
            {phase === 'results' ? (
              <QuestionSummary query={query} onEdit={() => setPhase('editing')} />
            ) : (
              <QuestionInput
                value={query}
                disabled={phase === 'searching'}
                searching={phase === 'searching'}
                shortcutLabel={searchShortcut}
                onChange={setQuery}
                onSearch={() => {
                  void runSearch();
                }}
              />
            )}
            <section className="result-pane" data-testid="result-pane">
              {statusPhase ? (
                <SearchStatus
                  phase={statusPhase}
                  invalidMessage={invalidMessage}
                  onFillExample={setQuery}
                />
              ) : phase === 'results' ? (
                <div className="card-list" data-testid="result-list">
                  {results.map((script) => (
                    <ScriptCard
                      key={script.scriptId}
                      script={script}
                      copying={copying}
                      onCopy={(item, trigger) => {
                        void copyScript(item, trigger);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <section className="result-pane" data-testid="result-pane">
            <RecentPanel facts={facts} />
          </section>
        )}
      </main>
      <AppFooter view={view} onViewChange={setView} shortcutLabel={footerHint} />
      {toast ? (
        <Toast
          toast={toast}
          onDismiss={dismissToast}
          onRetry={
            toast.kind === 'error' && pendingCopy
              ? () => {
                  void copyScript(pendingCopy, lastCopyButtonRef.current);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
