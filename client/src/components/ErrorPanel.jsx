// client/src/components/ErrorPanel.jsx — the error state (A.5): what failed, whether
// it will be retried, and a manual retry. Wording is domain language (A.6 item 4).
function describe(problem, subject) {
  const status = problem?.status;

  if (problem?.kind === 'forbidden') {
    return {
      title: `Your account can't open ${subject}`,
      body: 'You are signed in, and the answer is still no. Signing in again as the same person will not change it. Ask for access, or switch to an account that has it.',
    };
  }
  if (problem?.kind === 'cache_miss') return { title: problem.title, body: problem.detail };
  if (typeof status !== 'number') {
    return {
      title: 'Cannot reach the booking service',
      body: 'Your connection may be down, or the service is not running. Nothing has been changed.',
    };
  }
  if (status === 400) {
    return { title: 'That link is not valid', body: 'This address does not point to a court. Go back to the court list and pick one.' };
  }
  if (status >= 500) {
    return { title: 'The booking service had a problem', body: 'This is not something you did wrong.' };
  }
  return { title: problem.title || 'Something went wrong', body: problem.detail };
}

export default function ErrorPanel({ problem, willRetry, intervalMs, onRetry, subject }) {
  const { title, body } = describe(problem, subject);
  return (
    <div role="alert" className="bg-white border border-red-200 rounded-xl p-6">
      <h2 className="font-bold text-slate-900">{title}</h2>
      {body && <p className="text-sm text-slate-600 mt-1">{body}</p>}
      <p className="text-xs text-slate-500 mt-3">
        {willRetry ? `Trying again automatically every ${Math.round(intervalMs / 1000)} seconds.` : 'Not retrying automatically.'}
      </p>
      {problem?.instance && <p className="text-[11px] font-mono text-slate-400 mt-1">Reference: {problem.instance}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 px-3 py-1.5 border border-slate-300 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Try again now
      </button>
    </div>
  );
}
