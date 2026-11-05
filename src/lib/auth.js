import { api, getDB } from './store';
import { SCHOOL, SECURITY, RESTRICTED_MSG } from '../config';

// Accounts, codes and sessions live on the server (public/api/auth.php). The checks below give instant form
// feedback; the server repeats every one of them.

// ---------- SMCBI email validation ----------
export const slugName = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export const expectedEmail = (first, last) => `${slugName(last)}${slugName(first)}@${SCHOOL.emailDomain}`;

export function checkSchoolEmail(raw) {
  const email = (raw || '').trim().toLowerCase();
  if (!email) return { ok: false, error: `Please enter your ${SCHOOL.shortName} email.` };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  const [local, domain] = email.split('@');
  if (domain !== SCHOOL.emailDomain) return { ok: false, restricted: true, error: RESTRICTED_MSG };
  if (!/^[a-z]{2,}$/.test(local)) {
    return { ok: false, error: `Use the format lastnamefirstname@${SCHOOL.emailDomain}` };
  }
  return { ok: true, email };
}

export function checkPassword(pw) {
  if (!pw || pw.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.';
  return null;
}

// ---------- Server calls ----------
const auth = (action, payload) => api('auth.php', { action, ...payload });

// Resend cooldowns reported by the server, so the "Resend code" button can count down.
const cooldownUntil = {};
function trackCooldown(email, purpose, res) {
  if (res?.cooldown != null) cooldownUntil[`${purpose}|${email}`] = Date.now() + res.cooldown * 1000;
  return res;
}

export function otpCooldown(email, purpose) {
  const until = cooldownUntil[`${purpose}|${email}`] || 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

export async function registerAccount({ first, last, email, password }) {
  return trackCooldown(email, 'verify', await auth('register', { first, last, email, password }));
}

export async function resendCode(email, purpose) {
  return trackCooldown(email, purpose, await auth('resend', { email, purpose }));
}

// Verifies the emailed code; on success the server signs the user in and returns their data.
export async function verifyEmail(email, code) {
  const res = await auth('verify', { email, code });
  return res.ok ? { ok: true, user: currentUser() } : res;
}

export async function login(email, password, role) {
  const res = await auth('login', { email: email.trim().toLowerCase(), password, role });
  if (res.unverified) trackCooldown(res.email, 'verify', res);
  return res.ok ? { ok: true, user: currentUser() } : res;
}

export const logout = (reason) => auth('logout', { reason });

// One device per account: a signed-in page checks in every minute so the server knows the account is in use,
// and says so when it closes so another device can sign in straight away.
export const ping = () => auth('ping');
export function sayAway() {
  try {
    fetch('/api/auth.php', { method: 'POST', keepalive: true, credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'MindTrack' }, body: JSON.stringify({ action: 'away' }) }).catch(() => {});
  } catch {
    /* the server frees the account by itself after a few minutes */
  }
}

export async function requestReset(email) {
  return trackCooldown(email, 'reset', await auth('forgot', { email }));
}

export const resetPassword = (email, code, password) => auth('reset', { email, code, password });

export const changePassword = (userId, current, next) => auth('change_password', { current, next });

export function currentUser() {
  const db = getDB();
  return db.users.find((u) => u.id === db.me) || null;
}

// ---------- Idle timeout (per tab). The server also ends sessions after the same idle period. ----------
const SKEY = 'mindtrack.lastActive';

export function touchSession() {
  try {
    sessionStorage.setItem(SKEY, String(Date.now()));
  } catch {
    /* storage unavailable: the server-side timeout still applies */
  }
}

export function isIdle() {
  try {
    const last = Number(sessionStorage.getItem(SKEY));
    return last > 0 && Date.now() - last > SECURITY.sessionIdleMinutes * 60000;
  } catch {
    return false;
  }
}

// Registration progress survives a page refresh within the tab.
const PKEY = 'mindtrack.pending';
export const getPending = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PKEY));
  } catch {
    return null;
  }
};
export const setPending = (p) => (p ? sessionStorage.setItem(PKEY, JSON.stringify(p)) : sessionStorage.removeItem(PKEY));
