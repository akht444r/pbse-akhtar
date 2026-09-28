// client/src/components/SyncStatus.jsx — the age marker A.5 asks for. Data is never
// shown as though it were fresh when the last refresh failed.
import { useEffect, useState } from 'react';
import { formatClock, secondsAgo } from '../lib/format';

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function SyncStatus({ view, noun, intervalMs }) {
  const now = useNow();
  if (view.kind !== 'content') return null;

  const { fetchedAt, stale, lastSync } = view;
  const asOf = `Showing ${noun} as of ${formatClock(fetchedAt)}`;

  if (stale) {
    return (
      <p className="mb-4 text-xs rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
        {asOf}. Reconnecting… last attempt failed {secondsAgo(lastSync.at, now)} seconds ago.
      </p>
    );
  }

  const note = lastSync.outcome === 'unchanged' ? 'no changes since the last check (304 Not Modified)' : 'just updated';
  return (
    <p className="mb-4 text-xs text-slate-500">
      {asOf} · {note} · checks every {Math.round(intervalMs / 1000)}s
    </p>
  );
}
