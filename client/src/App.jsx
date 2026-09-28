// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import CourtList from './pages/CourtList';
import CourtDetail from './pages/CourtDetail';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '';
const apiUrl = (path) => `${API_BASE}${path}`;

function Navbar() {
  const { session, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sync recent bookings from localStorage whenever session changes or a booking event occurs
  useEffect(() => {
    const syncBookings = () => {
      const storageKey = session?.userId ? `bookings_${session.userId}` : 'my_bookings';
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setBookings(stored);
    };

    syncBookings();
    window.addEventListener('storage', syncBookings);
    window.addEventListener('booking_updated', syncBookings);

    return () => {
      window.removeEventListener('storage', syncBookings);
      window.removeEventListener('booking_updated', syncBookings);
    };
  }, [session?.userId]);

  const handleSignIn = async (key) => {
    setAuthError(null);
    try {
      await signIn(key);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-black text-slate-900 text-lg tracking-tight">
            CampusCourt
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/" className="text-slate-600 hover:text-blue-600 transition">
              Courts
            </Link>

            {/* My Bookings Dropdown */}
            {session && bookings.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5 transition"
                >
                  My Bookings ({bookings.length})
                  <span className="text-[10px]">▼</span>
                </button>

                {menuOpen && (
                  <div 
                    className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Saved Reservations
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {bookings.map((id) => (
                        <Link
                          key={id}
                          to={`/bookings/${id}`}
                          onClick={() => setMenuOpen(false)}
                          className="block px-3 py-2 text-xs font-mono text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                        >
                          {id}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Identity & Persona Controls */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">{session.name}</div>
                <div className="text-[10px] font-mono text-slate-400">{session.userId}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleSignIn('studentA')}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
              >
                Sign in as Student A
              </button>
              <button
                onClick={() => handleSignIn('studentB')}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-900 transition"
              >
                Sign in as Student B
              </button>
            </div>
          )}
        </div>
      </div>
      {authError && (
        <div role="alert" className="bg-red-50 border-t border-red-200 text-red-800 text-xs px-4 py-2 text-center">
          {authError}
        </div>
      )}
    </header>
  );
}

function LoginPage() {
  const { signIn, personas } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const returnTo = query.get('returnTo') || '/';

  const [error, setError] = useState(null);
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';

  const handleSelect = async (key) => {
    setError(null);
    try {
      await signIn(key);
      navigate(safeReturnTo);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-2">Sign In Required</h2>
      <p className="text-xs text-slate-500 mb-6">Select a synthetic test persona to continue to this view.</p>
      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-4">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {Object.entries(personas).map(([key, p]) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className="w-full p-3 border rounded-lg text-left hover:border-blue-500 hover:bg-blue-50/50 transition"
          >
            <div className="font-bold text-sm text-slate-800">{p.name}</div>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">{p.userId}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BookingForm() {
  const { courtId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth.token || auth.session?.token || auth.session?.accessToken || (auth.personas && auth.session?.userId && Object.values(auth.personas).find(p => p.userId === auth.session.userId)?.token);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!auth.session) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded-xl border border-slate-200 text-center">
        <h2 className="text-base font-bold text-slate-900 mb-2">Sign In Required</h2>
        <p className="text-xs text-slate-500 mb-4">Please sign in to proceed with booking this court.</p>
        <Link
          to={`/login?returnTo=/courts/${courtId}/book`}
          className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const slotStart = new Date(`${date}T${startTime}:00`);
    const slotEnd = new Date(`${date}T${endTime}:00`);

    if (slotEnd <= slotStart) {
      setError('End time must be strictly after start time.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl('/v1/bookings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          courtId,
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.title || 'Failed to create booking.');
      }

      const bookingId = data.id || data.bookingId;
      if (bookingId) {
        const storageKey = auth.session?.userId ? `bookings_${auth.session.userId}` : 'my_bookings';
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!existing.includes(bookingId)) {
          localStorage.setItem(storageKey, JSON.stringify([bookingId, ...existing]));
          window.dispatchEvent(new Event('booking_updated'));
        }
        navigate(`/bookings/${bookingId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <Link to={`/courts/${courtId}`} className="text-xs font-semibold text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Court Details
      </Link>
      
      <h2 className="text-xl font-bold text-slate-900 mb-1">Book Court</h2>
      <p className="text-xs text-slate-500 mb-6">Court identifier: <span className="font-mono text-slate-700">{courtId}</span></p>

      {error && (
        <div role="alert" className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Select Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition disabled:opacity-50 mt-2"
        >
          {loading ? 'Submitting Reservation...' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  );
}

function BookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const token = auth.token || auth.session?.token || auth.session?.accessToken || (auth.personas && auth.session?.userId && Object.values(auth.personas).find(p => p.userId === auth.session.userId)?.token);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      if (!token) {
        setError('Sign in required to view booking.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(apiUrl(`/v1/bookings/${bookingId}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Booking not found or access denied.');
        }
        setBooking(data);

        // Record booking ID so it appears in recent bookings
        if (data.id) {
          const storageKey = auth.session?.userId ? `bookings_${auth.session.userId}` : 'my_bookings';
          const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
          if (!existing.includes(data.id)) {
            localStorage.setItem(storageKey, JSON.stringify([data.id, ...existing]));
            window.dispatchEvent(new Event('booking_updated'));
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId, token]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      const res = await fetch(apiUrl(`/v1/bookings/${bookingId}/cancellation`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to cancel booking.');
      }
      setBooking(data);
      window.dispatchEvent(new Event('booking_updated'));
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading booking record...</div>;
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white border border-slate-200 rounded-xl text-center shadow-sm">
        <p className="text-xs font-semibold text-red-600 mb-4">{error}</p>
        <Link to="/" className="text-xs text-blue-600 hover:underline">
          &larr; Return to Court List
        </Link>
      </div>
    );
  }

  const isCancelled = booking.status?.toLowerCase() === 'cancelled';

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Reservation Details</span>
          <h2 className="text-lg font-mono font-bold text-slate-900">{booking.id}</h2>
        </div>
        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${isCancelled ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {booking.status?.toUpperCase() || 'CONFIRMED'}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-xs mb-6">
        <div>
          <dt className="text-slate-400">Court ID</dt>
          <dd className="font-semibold text-slate-800 mt-0.5">{booking.courtId || booking.court_id}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Reserved By</dt>
          <dd className="font-mono text-slate-800 mt-0.5">{booking.reservedBy || booking.reserved_by}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Slot Start</dt>
          <dd className="font-medium text-slate-800 mt-0.5">{new Date(booking.slotStart || booking.slot_start).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Slot End</dt>
          <dd className="font-medium text-slate-800 mt-0.5">{new Date(booking.slotEnd || booking.slot_end).toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Total Price</dt>
          <dd className="font-bold text-slate-900 mt-0.5">Rp {(booking.grandTotal || booking.grand_total || booking.total_fee || 0).toLocaleString('id-ID')}</dd>
        </div>
      </dl>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-2 text-xs font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
        >
          Back to Courts
        </button>

        {!isCancelled && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        )}
      </div>
    </div>
  );
}

function Shell() {
  const { session } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* key: screens remount when the signed-in person changes, so one person's data is never left on screen for another */}
        <Routes key={session?.userId ?? 'signed-out'}>
          {/* Workflow 1: Explore facilities (Member 2) */}
          <Route path="/" element={<CourtList />} />
          <Route path="/courts/:courtId" element={<CourtDetail />} />

          {/* Member 3: Booking Form & Booking Detail */}
          <Route path="/courts/:courtId/book" element={<BookingForm />} />
          <Route path="/bookings/:bookingId" element={<BookingDetail />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<div className="p-12 text-center text-slate-400">404 - Screen Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}