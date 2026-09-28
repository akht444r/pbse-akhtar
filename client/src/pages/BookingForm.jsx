import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';

export default function BookingForm() {
  const { courtId } = useParams();
  const navigate = useNavigate();

  // A.6 item 3: one key per booking intent. Kept across retries of the SAME
  // click so a resubmit after a network error replays instead of double-booking;
  // regenerated only once the previous attempt truly succeeds or the form unmounts.
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const [form, setForm] = useState({
    slotStart: '',
    slotEnd: '',
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));

    setSubmitError('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.slotStart) {
      nextErrors.slotStart = 'Start time is required.';
    }

    if (!form.slotEnd) {
      nextErrors.slotEnd = 'End time is required.';
    }

    if (form.slotStart && form.slotEnd) {
      const start = new Date(form.slotStart);
      const end = new Date(form.slotEnd);

      if (Number.isNaN(start.getTime())) {
        nextErrors.slotStart = 'Start time is invalid.';
      }

      if (Number.isNaN(end.getTime())) {
        nextErrors.slotEnd = 'End time is invalid.';
      }

      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        end <= start
      ) {
        nextErrors.slotEnd = 'End time must be after start time.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await api.createBooking(
        {
          courtId,
          slotStart: new Date(form.slotStart).toISOString(),
          slotEnd: new Date(form.slotEnd).toISOString(),
        },
        idempotencyKeyRef.current
      );

      const bookingId = result.data?.id || result.data?.bookingId;

      if (!bookingId) {
        throw new Error('Booking was created but no booking ID was returned.');
      }

      navigate(`/bookings/${bookingId}`);
    } catch (error) {
      if (error?.status === 400 || error?.status === 422) {
        // A.6: the service names every bad field as invalidFields: [{ name, reason }].
        // Turn that into { fieldName: message } so it lands under the right input.
        if (Array.isArray(error?.invalidFields) && error.invalidFields.length > 0) {
          setErrors(
            error.invalidFields.reduce((acc, f) => ({ ...acc, [f.name]: f.reason }), {})
          );
        } else {
          setErrors({
            form: error?.detail || 'Please check the booking information and try again.',
          });
        }
      } else if (error?.status === 409) {
        setSubmitError(
          error?.detail || 'This booking conflicts with an existing booking.'
        );
      } else {
        setSubmitError(
          error?.detail ||
            error?.message ||
            'Unable to create the booking. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            New Booking
          </p>

          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Book Court
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Court ID: <span className="font-mono">{courtId}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="slotStart"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Start Time
            </label>

            <input
              id="slotStart"
              name="slotStart"
              type="datetime-local"
              value={form.slotStart}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-invalid={Boolean(errors.slotStart)}
              aria-describedby={
                errors.slotStart ? 'slotStart-error' : undefined
              }
            />

            {errors.slotStart && (
              <p
                id="slotStart-error"
                className="mt-1.5 text-xs text-red-600"
              >
                {errors.slotStart}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="slotEnd"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              End Time
            </label>

            <input
              id="slotEnd"
              name="slotEnd"
              type="datetime-local"
              value={form.slotEnd}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-invalid={Boolean(errors.slotEnd)}
              aria-describedby={
                errors.slotEnd ? 'slotEnd-error' : undefined
              }
            />

            {errors.slotEnd && (
              <p
                id="slotEnd-error"
                className="mt-1.5 text-xs text-red-600"
              >
                {errors.slotEnd}
              </p>
            )}
          </div>

          {errors.form && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errors.form}
            </div>
          )}

          {submitError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/courts/${courtId}`)}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Booking...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}