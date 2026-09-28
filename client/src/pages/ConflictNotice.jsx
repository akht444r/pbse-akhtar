import React from 'react';

export default function ConflictNotice({ message, onRetry, onBack }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-amber-200 p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Booking Conflict
          </p>

          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Booking Has Changed
          </h1>

          <p className="text-sm text-slate-600 mt-2">
            {message ||
              'This booking was changed by another request. Please refresh the booking before trying again.'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
            >
              Refresh Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
