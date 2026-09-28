import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import ConflictNotice from './ConflictNotice';

export default function BookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [etag, setEtag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [showConflict, setShowConflict] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadBooking() {
      setLoading(true);
      setError('');

      try {
        const result = await api.getBookingById(bookingId);

        if (!active) return;

        setBooking(result.data);
        setEtag(result.etag);
      } catch (err) {
        if (!active) return;

        setError(
          err?.detail ||
            err?.message ||
            'Unable to load this booking.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBooking();

    return () => {
      active = false;
    };
  }, [bookingId]);

  const handleCancel = async () => {
    if (!etag) {
      setCancelError(
        'The booking version is unavailable. Please refresh the page and try again.'
      );
      return;
    }

    setCancelling(true);
    setCancelError('');

    try {
      await api.cancelBooking(bookingId, etag);

      setCancelled(true);

      setBooking((current) =>
        current
          ? {
              ...current,
              status: 'cancelled',
            }
          : current
      );
    } catch (err) {
      if (err?.status === 412 || err?.kind === 'precondition_failed') {
  	setShowConflict(true);
      } else {
        setCancelError(
          err?.detail ||
            err?.message ||
            'Unable to cancel this booking.'
        );
      }
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-500">Loading booking...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-red-200 p-6">
        <h1 className="text-lg font-bold text-red-700">
          Unable to load booking
        </h1>

        <p className="text-sm text-red-600 mt-2">{error}</p>

        <button
          onClick={() => navigate('/')}
          className="mt-5 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold"
        >
          Back to Courts
        </button>
      </div>
    );
  }

  if (!booking) {
    return null;
  }
  
  if (showConflict) {
    return (
      <ConflictNotice
        message="This booking has changed since you opened it. Refresh the booking before trying again."
        onRetry={() => window.location.reload()}
        onBack={() => navigate('/')}
      />
    );
  }

  const status = booking.status || 'unknown';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Booking
            </p>

            <h1 className="text-2xl font-black text-slate-900 mt-1">
              Booking Details
            </h1>

            <p className="text-xs font-mono text-slate-400 mt-1">
              {booking.id || booking.bookingId || bookingId}
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              status === 'confirmed'
                ? 'bg-green-100 text-green-700'
                : status === 'cancelled'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {status}
          </span>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
          <div className="flex justify-between gap-4 p-4">
            <span className="text-sm text-slate-500">Court</span>
            <span className="text-sm font-semibold text-slate-800">
              {booking.court_id || booking.courtId || '-'}
            </span>
          </div>

          <div className="flex justify-between gap-4 p-4">
            <span className="text-sm text-slate-500">User</span>
            <span className="text-sm font-semibold text-slate-800">
              {booking.user_id || booking.userId || '-'}
            </span>
          </div>

          <div className="flex justify-between gap-4 p-4">
            <span className="text-sm text-slate-500">Start</span>
            <span className="text-sm font-semibold text-slate-800">
              {booking.slot_start
                ? new Date(booking.slot_start).toLocaleString()
                : booking.slotStart
                  ? new Date(booking.slotStart).toLocaleString()
                  : '-'}
            </span>
          </div>

          <div className="flex justify-between gap-4 p-4">
            <span className="text-sm text-slate-500">End</span>
            <span className="text-sm font-semibold text-slate-800">
              {booking.slot_end
                ? new Date(booking.slot_end).toLocaleString()
                : booking.slotEnd
                  ? new Date(booking.slotEnd).toLocaleString()
                  : '-'}
            </span>
          </div>

          <div className="flex justify-between gap-4 p-4">
            <span className="text-sm text-slate-500">Total Fee</span>
            <span className="text-sm font-semibold text-slate-800">
              {booking.total_fee != null
                ? `Rp ${Number(booking.total_fee).toLocaleString('id-ID')}`
                : booking.totalFee != null
                  ? `Rp ${Number(booking.totalFee).toLocaleString('id-ID')}`
                  : '-'}
            </span>
          </div>
        </div>

        {cancelled && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Booking cancelled successfully.
          </div>
        )}

        {cancelError && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {cancelError}
          </div>
        )}

        <div className="flex justify-between items-center gap-3 mt-6">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Courts
          </button>

          {status === 'confirmed' && !cancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
