// client/src/hooks/usePolledResource.js
//
// One hook that gives a screen its four states (A.5) and keeps it fresh with
// conditional polling (A.7). The screen never calls fetch(); it passes in one of
// the domain functions from api/client.js.
//
//   { kind: 'loading' }
//   { kind: 'empty' }
//   { kind: 'error',   problem, willRetry }
//   { kind: 'content', data, fetchedAt, stale, lastSync }
import { useCallback, useEffect, useRef, useState } from 'react';

export const POLL_MS = Number(import.meta.env.VITE_POLL_MS) || 10000;

// The last body received per endpoint. Module level, so it survives re-renders
// and re-mounts. The API layer remembers ETags across polls; when the service
// answers 304 (no body) this is the copy we keep showing.
const dataCache = new Map();

// Network failures and 5xx may heal on their own; a 400/403 will not.
function isRetryable(problem) {
  if (problem?.kind === 'cache_miss') return false;
  const status = problem?.status;
  if (typeof status !== 'number') return true;
  if (status === 408 || status === 429) return true;
  return status >= 500;
}

export function usePolledResource(
  key,
  fetcher,
  { intervalMs = POLL_MS, isEmpty = () => false, emptyOn404 = false } = {}
) {
  const [view, setView] = useState({ kind: 'loading' });
  const [restarts, setRestarts] = useState(0);
  const viewRef = useRef(view);
  const stopped = useRef(false);
  const latest = useRef({ fetcher, isEmpty, emptyOn404 });

  useEffect(() => {
    viewRef.current = view;
    latest.current = { fetcher, isEmpty, emptyOn404 };
  });

  const run = useCallback(
    async (isCancelled) => {
      const { fetcher: load, isEmpty: empty, emptyOn404: notFoundIsEmpty } = latest.current;
      try {
        const res = await load();
        let data;
        let outcome;

        if (res.notModified) {
          // A.7 item 3: a 304 is a successful read. Nothing changed, so keep the data
          // we already hold and refresh the "as of" time.
          data = res.data !== undefined ? res.data : dataCache.get(key)?.data;
          if (data === undefined) {
            throw {
              kind: 'cache_miss',
              title: 'This page needs a fresh copy',
              detail: 'The service reports nothing has changed, but this page has no saved copy to show. Reload the page to fetch it again.',
            };
          }
          outcome = 'unchanged';
        } else {
          data = res.data;
          outcome = 'updated';
        }

        const at = new Date();
        dataCache.set(key, { data, at });
        if (isCancelled()) return;

        setView((prev) => {
          if (outcome === 'unchanged' && prev.kind === 'content') {
            // Same data object, only the timestamps move: children do not re-render.
            return { ...prev, fetchedAt: at, stale: false, lastSync: { at, outcome } };
          }
          if (empty(data)) return { kind: 'empty' };
          return { kind: 'content', data, fetchedAt: at, stale: false, lastSync: { at, outcome } };
        });
      } catch (problem) {
        if (isCancelled()) return;
        // 401: the API layer is already sending the person to sign-in.
        if (problem?.kind === 'unauthenticated') return;

        if (notFoundIsEmpty && problem?.kind === 'not_found') {
          stopped.current = true;
          setView({ kind: 'empty' });
          return;
        }

        const at = new Date();
        const hasContent = viewRef.current.kind === 'content';
        const willRetry = isRetryable(problem);
        if (!hasContent && !willRetry) stopped.current = true;

        setView((prev) =>
          prev.kind === 'content'
            ? { ...prev, stale: true, lastSync: { at, outcome: 'failed', problem } } // A.5: keep the data, mark it stale
            : { kind: 'error', problem, willRetry }
        );
      }
    },
    [key]
  );

  useEffect(() => {
    let cancelled = false;
    let timer;
    stopped.current = false;
    const isCancelled = () => cancelled;

    const tick = async (initial) => {
      // Always load once on arrival; afterwards skip polls while the tab is hidden.
      if (initial || !document.hidden) await run(isCancelled);
      if (!cancelled && !stopped.current) timer = setTimeout(() => tick(false), intervalMs);
    };
    const onVisible = () => {
      if (!document.hidden && !stopped.current) run(isCancelled);
    };

    document.addEventListener('visibilitychange', onVisible);
    tick(true);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [run, intervalMs, restarts]);

  // Manual retry: restart the loop, which loads immediately.
  const refresh = useCallback(() => {
    setView((v) => (v.kind === 'error' ? { kind: 'loading' } : v));
    setRestarts((n) => n + 1);
  }, []);

  return { view, refresh };
}
