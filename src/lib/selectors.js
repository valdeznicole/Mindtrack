import { todayISO, addDays, fmtShort, weekdayShort } from './dates';

export const byId = (db, id) => db.users.find((u) => u.id === id);
export const fullName = (u) => (u ? `${u.first_name} ${u.last_name}` : 'Unknown');
export const initials = (u) => (u ? `${u.first_name[0] || ''}${u.last_name[0] || ''}`.toUpperCase() : '?');
// Active students only: archived accounts are left out of lists, counts and statistics.
export const students = (db) => db.users.filter((u) => u.role === 'student' && u.profile_complete && !u.archived);
export const archivedStudents = (db) => db.users.filter((u) => u.role === 'student' && u.archived);
// Review flags that still need attention belong to active students only.
export const activeFlags = (db) => {
  const archived = new Set(archivedStudents(db).map((u) => u.id));
  return db.flags.filter((f) => !archived.has(f.user_id));
};
export const counselorsOf = (db) => db.users.filter((u) => u.role === 'counselor');
// Guidance staff: one superadmin plus the admins they added (both have the counselor role).
export const staffOf = (db) => db.users.filter((u) => u.role === 'counselor');
export const isSuperadmin = (db) => !!byId(db, db.me)?.is_super;

export const moodsOf = (db, userId) =>
  db.moods.filter((m) => m.user_id === userId).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
export const todayMoodOf = (db, userId) => db.moods.find((m) => m.user_id === userId && m.date === todayISO());

// Chart series: daily points for 7/30 days, weekly averages for 90 days. Missing days are null.
export function moodSeries(db, userId, range) {
  const today = todayISO();
  const map = new Map(db.moods.filter((m) => m.user_id === userId).map((m) => [m.date, m]));
  if (range <= 30) {
    return Array.from({ length: range }, (_, i) => {
      const date = addDays(today, i - range + 1);
      const m = map.get(date);
      return { label: range === 7 ? weekdayShort(date) : fmtShort(date), value: m ? m.mood_value : null, date, mood: m?.mood };
    });
  }
  const weeks = Math.ceil(range / 7);
  return Array.from({ length: weeks }, (_, w) => {
    const start = addDays(today, -(weeks - w) * 7 + 1);
    const vals = [];
    for (let i = 0; i < 7; i++) {
      const m = map.get(addDays(start, i));
      if (m) vals.push(m.mood_value);
    }
    return { label: fmtShort(start), value: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null, date: start };
  });
}

export function wellnessOf(db, userId) {
  const rows = db.wellnessScores.filter((w) => w.user_id === userId).sort((a, b) => a.date.localeCompare(b.date));
  return { current: rows.at(-1) || null, previous: rows.length > 1 ? rows.at(-2) : null, rows };
}

export const isActiveAppt = (a) => a.status === 'pending' || a.status === 'confirmed';
export const apptSort = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);

export function upcomingOf(db, userId) {
  const today = todayISO();
  return db.appointments.filter((a) => a.student_id === userId && isActiveAppt(a) && a.date >= today).sort(apptSort);
}

export const unreadCount = (db, userId) => db.notifications.filter((n) => n.user_id === userId && !n.read).length;

export const surveyQuestions = (db, surveyId) =>
  db.surveyQuestions.filter((q) => q.survey_id === surveyId).sort((a, b) => a.order - b.order);

export const activeSurvey = (db) => db.surveys.find((s) => s.active);

export function moodDistribution(moods) {
  const counts = {};
  moods.forEach((m) => (counts[m.mood] = (counts[m.mood] || 0) + 1));
  return counts;
}
