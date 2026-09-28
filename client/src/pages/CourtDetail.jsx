// client/src/pages/CourtDetail.jsx — Workflow 1, screen 2: Court detail (route "/courts/:courtId").
// Operation: GET /v1/courts/{courtId} (1 call per screen, polled with If-None-Match).
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { usePolledResource, POLL_MS } from '../hooks/usePolledResource';
import { CourtDetailSkeleton } from '../components/Skeleton';
import ErrorPanel from '../components/ErrorPanel';
import SyncStatus from '../components/SyncStatus';
import { formatMoney } from '../lib/format';

// The court id lives in the address, not in component state (A.2 item 1), so the URL
// can be copied into a new tab. `key` remounts the body when the id changes, so one
// court's data is never shown under another court's address.
export default function CourtDetail() {
  const { courtId } = useParams();
  return <CourtDetailBody key={courtId} courtId={courtId} />;
}

function CourtDetailBody({ courtId }) {
  const safeId = encodeURIComponent(courtId);
  // 404 covers "does not exist" and "not yours" alike; the client must not tell them
  // apart (A.3), so it becomes the empty state.
  const { view, refresh } = usePolledResource(`/v1/courts/${safeId}`, () => api.getCourtById(safeId), {
    emptyOn404: true,
  });

  return (
    <section>
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        ← All courts
      </Link>
      <div className="mt-4">
        <SyncStatus view={view} noun="this court" intervalMs={POLL_MS} />

        {view.kind === 'loading' && <CourtDetailSkeleton />}

        {view.kind === 'empty' && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h1 className="font-bold text-slate-900">We couldn't find that court</h1>
            <p className="text-sm text-slate-500 mt-1">It may have been removed, or the link may be wrong.</p>
            <Link to="/" className="inline-block mt-4 text-sm font-semibold text-blue-600 hover:underline">
              Browse all courts
            </Link>
          </div>
        )}

        {view.kind === 'error' && (
          <ErrorPanel problem={view.problem} willRetry={view.willRetry} intervalMs={POLL_MS} onRetry={refresh} subject="this court" />
        )}

        {view.kind === 'content' && <CourtSummary court={view.data} />}
      </div>
    </section>
  );
}

function CourtSummary({ court }) {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-6">
      <h1 className="text-2xl font-black text-slate-900">{court.name}</h1>
      <p className="text-sm text-slate-500 mt-1 capitalize">{court.courtType} court</p>

      <dl className="grid grid-cols-2 gap-4 mt-6 text-sm">
        <div>
          <dt className="text-slate-500">Price</dt>
          <dd className="font-semibold text-slate-900">{formatMoney(court.hourlyRate, court.currency)} / hour</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="font-semibold text-slate-900">{court.isAvailable ? 'Open for booking' : 'Not open for booking'}</dd>
        </div>
      </dl>

      <div className="mt-6">
        {court.isAvailable ? (
          <Link
            to={`/courts/${court.id}/book`}
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700"
          >
            Book this court
          </Link>
        ) : (
          <p className="text-sm text-slate-500">This court is not open for booking right now. It stays listed so you can check back later.</p>
        )}
      </div>
      <p className="text-[11px] font-mono text-slate-400 mt-6">{court.id}</p>
    </article>
  );
}
