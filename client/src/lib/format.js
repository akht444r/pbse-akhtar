// client/src/lib/format.js — small display helpers shared by the catalogue pages.

export function formatMoney(amount, currency = 'IDR') {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function formatClock(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function secondsAgo(date, now = Date.now()) {
  return Math.max(0, Math.round((now - date.getTime()) / 1000));
}
