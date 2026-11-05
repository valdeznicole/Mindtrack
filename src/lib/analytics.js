import { MOODS } from './moods';
import { addDays, todayISO, weekdayShort, fmtShort } from './dates';
import { students } from './selectors';

// Aggregate, de-identified mood statistics for counselor overviews.
export function moodStats(db, days = 1) {
  const ids = new Set(students(db).map((s) => s.id));
  const since = addDays(todayISO(), -days + 1);
  const moods = db.moods.filter((m) => ids.has(m.user_id) && m.date >= since);
  const counts = Object.fromEntries(MOODS.map((m) => [m.key, 0]));
  moods.forEach((m) => counts[m.mood]++);
  const total = moods.length;
  return {
    total,
    breakdown: MOODS.map((m) => ({ ...m, count: counts[m.key], pct: total ? Math.round((counts[m.key] / total) * 100) : 0 })),
  };
}

// Share of possible daily check-ins (students × days) that actually happened.
export function checkinRate(db, days = 7) {
  const ids = new Set(students(db).map((s) => s.id));
  const since = addDays(todayISO(), -days + 1);
  const n = db.moods.filter((m) => m.date >= since && ids.has(m.user_id)).length;
  return ids.size ? Math.round((n / (ids.size * days)) * 100) : 0;
}

export function dailyCheckins(db, days = 7) {
  const ids = new Set(students(db).map((s) => s.id));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(todayISO(), i - days + 1);
    return { label: days <= 7 ? weekdayShort(date) : fmtShort(date), value: db.moods.filter((m) => m.date === date && ids.has(m.user_id)).length, date };
  });
}

export function avgMoodSeries(db, days = 30) {
  const ids = new Set(students(db).map((s) => s.id));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(todayISO(), i - days + 1);
    const ms = db.moods.filter((m) => m.date === date && ids.has(m.user_id));
    return { label: fmtShort(date), value: ms.length ? +(ms.reduce((s, m) => s + m.mood_value, 0) / ms.length).toFixed(2) : null, date };
  });
}

export const latestScore = (db, userId) =>
  db.wellnessScores.filter((w) => w.user_id === userId).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
