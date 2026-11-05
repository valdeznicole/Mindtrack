const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000);
export const fmtDate = (s, opts = { month: 'long', day: 'numeric', year: 'numeric' }) =>
  parseISO(s).toLocaleDateString('en-US', opts);
export const fmtShort = (s) => fmtDate(s, { month: 'short', day: 'numeric' });
export const fmtLong = (s) => fmtDate(s, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const relDay = (s) => {
  const d = diffDays(todayISO(), s);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d === -1) return 'Tomorrow';
  const sameYear = parseISO(s).getFullYear() === new Date().getFullYear();
  return fmtDate(s, sameYear ? { month: 'long', day: 'numeric' } : { month: 'long', day: 'numeric', year: 'numeric' });
};
export const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
export const fmtDateTime = (ts) =>
  new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
export const isWeekend = (s) => [0, 6].includes(parseISO(s).getDay());
export const weekdayShort = (s) => parseISO(s).toLocaleDateString('en-US', { weekday: 'short' });
export const startOfWeek = (s) => addDays(s, -parseISO(s).getDay());
export const monthLabel = (y, m) => new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

// Weeks of a month as arrays of 7 ISO dates (null for padding days).
export function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toISO(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
