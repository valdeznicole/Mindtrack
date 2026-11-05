import { call } from './store';
import { todayISO } from './dates';

// Every change is made by the PHP API (public/api/action.php), which checks the user's role and ownership,
// computes scores and review flags, and sends notifications. Each call resolves with the action's result.

// ---------- Notifications ----------
export const markNotificationRead = (id) => call('markNotificationRead', { id });
export const markAllRead = () => call('markAllRead');
export const deleteNotification = (id) => call('deleteNotification', { id });

// ---------- Daily mood & wellness survey ----------
export const saveMood = (userId, { mood, note, factors }) => call('saveMood', { mood, note, factors });
export const submitSurvey = (userId, surveyId, answers) => call('submitSurvey', { surveyId, answers });

// ---------- Wellness activities & challenges ----------
export const logActivity = (userId, type, duration = 0) => call('logActivity', { type, duration });

export function dailyChallenges(db, date = todayISO()) {
  const active = db.challenges.filter((c) => c.active);
  if (active.length <= 3) return active;
  let seed = [...date].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
  const pool = [...active];
  const picked = [];
  while (picked.length < 3) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    picked.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return picked;
}

export function isChallengeDone(db, userId, challengeId, date = todayISO()) {
  return db.challengeProgress.some((p) => p.user_id === userId && p.challenge_id === challengeId && p.date === date);
}

export const toggleChallenge = (userId, challengeId) => call('toggleChallenge', { challengeId });
export const saveChallenge = (data) => call('saveChallenge', data);
export const deleteChallenge = (id) => call('deleteChallenge', { id });

// ---------- Journal ----------
export const saveJournal = (userId, entry) =>
  call('saveJournal', { id: entry.id, title: entry.title, content: entry.content, mood: entry.mood, tags: entry.tags, date: entry.date, is_shared: entry.is_shared });
export const deleteJournal = (userId, id) => call('deleteJournal', { id });

// ---------- Appointments ----------
export const bookAppointment = (studentId, slotId, reason = '') => call('bookAppointment', { slotId, reason });
export const cancelAppointment = (apptId) => call('cancelAppointment', { apptId });
export const rescheduleAppointment = (apptId, slotId) => call('rescheduleAppointment', { apptId, slotId });
export const setAppointmentStatus = (apptId, status, notes) => call('setAppointmentStatus', notes === undefined ? { apptId, status } : { apptId, status, notes });
export const addReminder = (apptId) => call('addReminder', { apptId });
export const addAvailability = (counselorId, dates, times) => call('addAvailability', { dates, times });
export const blockDate = (counselorId, date) => call('blockDate', { date });
export const setSlotStatus = (slotId, status) => call('setSlotStatus', { slotId, status });

// ---------- Counselor ----------
export const reviewFlag = (flagId, counselorId, status) => call('reviewFlag', { flagId, status });
// Records a counselor viewing student data. Logging failures shouldn't interrupt the counselor.
export const logAccess = (type, detail) => call('logEvent', { type, detail }).catch(() => {});

// ---------- Counselor: student accounts ----------
export const createStudent = (data) => call('createStudent', data, { quiet: true });
export const updateStudent = (data) => call('updateStudent', data, { quiet: true });
export const archiveStudent = (id) => call('archiveStudent', { id });
export const restoreStudent = (id) => call('restoreStudent', { id });
export const deleteStudent = (id, confirm) => call('deleteStudent', { id, confirm }, { quiet: true });

// ---------- Superadmin: officers and staff accounts ----------
export const setOfficer = (id, position) => call('setOfficer', { id, position });
export const createStaff = (data) => call('createStaff', data, { quiet: true });
export const updateStaff = (data) => call('updateStaff', data, { quiet: true });
export const archiveStaff = (id) => call('archiveStaff', { id });
export const restoreStaff = (id) => call('restoreStaff', { id });

// ---------- Counselor: Wellness Check questionnaires ----------
export const saveSurvey = (data) => call('saveSurvey', data);
export const duplicateSurvey = (id) => call('duplicateSurvey', { id });
export const setActiveSurvey = (id) => call('setActiveSurvey', { id });
export const deleteSurvey = (id) => call('deleteSurvey', { id });
export const saveQuestion = (data) => call('saveQuestion', data);
export const deleteQuestion = (id) => call('deleteQuestion', { id });
export const moveQuestion = (id, dir) => call('moveQuestion', { id, dir });

// ---------- Account ----------
export const updateSettings = (settings) => call('updateSettings', { settings });
export const completeProfile = (profile) => call('completeProfile', profile, { quiet: true });
