// client/src/pages/CourtList.jsx — Workflow 1, screen 1: Court catalogue (route "/").
// Operation: GET /v1/courts (1 call per screen, polled with If-None-Match).
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { usePolledResource, POLL_MS } from '../hooks/usePolledResource';
import { CourtListSkeleton } from '../components/Skeleton';
import ErrorPanel from '../components/ErrorPanel';
import SyncStatus from '../components/SyncStatus';
import { formatMoney } from '../lib/format';

const isEmpty = (courts) => !Array.isArray(courts) || courts.length === 0;
const fetchCourts = () => api.getCourts();

// memo: a 304 keeps the same `courts` array, so the cards are not re-rendered.
const CourtCard = memo(function CourtCard({ court }) {
  return (
    <Link
      to={`/courts/${court.id}`}
      className={`block bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-500 transition ${
        court.isAvailable ? '' : 'opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-bold text-slate-900">{court.name}</h2>
        <span
          className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            court.isAvailable ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {court.isAvailable ? 'Available' : 'Not open for booking'}
        </span>
      </div>
      <p className="text-sm text-slate-500 mt-1 capitalize">{court.courtType} court</p>
      <p className="text-sm font-semibold text-slate-800 mt-3">{formatMoney(court.hourlyRate, court.currency)} / hour</p>
    </Link>
  );
});

const CourtGrid = memo(function CourtGrid({ courts }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courts.map((court) => (
        <CourtCard key={court.id} court={court} />
      ))}
    </div>
  );
});

export default function CourtList() {
  const { view, refresh } = usePolledResource('/v1/courts', fetchCourts, { isEmpty });

  return (
    <section aria-labelledby="courts-heading">
      <h1 id="courts-heading" className="text-2xl font-black text-slate-900">
        Courts
      </h1>
      <p className="text-sm text-slate-500 mt-1 mb-4">Pick a court to see its details and book a slot.</p>

      <SyncStatus view={view} noun="courts" intervalMs={POLL_MS} />

      {view.kind === 'loading' && <CourtListSkeleton />}

      {view.kind === 'empty' && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <h2 className="font-bold text-slate-900">No courts are listed yet</h2>
          <p className="text-sm text-slate-500 mt-1">Courts appear here as soon as the facility adds them. This page checks again by itself.</p>
        </div>
      )}

      {view.kind === 'error' && (
        <ErrorPanel problem={view.problem} willRetry={view.willRetry} intervalMs={POLL_MS} onRetry={refresh} subject="the court list" />
      )}

      {view.kind === 'content' && <CourtGrid courts={view.data} />}
    </section>
  );
}
