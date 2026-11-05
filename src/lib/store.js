import { useSyncExternalStore } from 'react';

// Client cache of the server snapshot. The PHP API decides what each user may see;
// every change goes through the API and the response replaces this snapshot.
const API = import.meta.env.VITE_API_URL || '/api';

const EMPTY = {
  me: null, users: [], moods: [], surveys: [], surveyQuestions: [], surveyResponses: [], wellnessScores: [], flags: [],
  journals: [], appointments: [], slots: [], activities: [], notifications: [], challenges: [], challengeProgress: [],
  securityLog: [], outbox: [],
};

let db = EMPTY;
let version = 0;
const listeners = new Set();
let onError = () => {};
let onSignedOut = () => {};

export const getDB = () => db;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export function setDB(next) {
  // `outbox` is client-only: codes shown on screen while MAIL_MODE is 'show' (testing without email).
  db = { ...EMPTY, ...next, outbox: db.outbox };
  emit();
}

export function showDevMail(mail) {
  if (!mail) return;
  db = { ...db, outbox: [{ id: `${Date.now()}`, at: Date.now(), ...mail }] };
  emit();
}

// App registers how to surface failures (toast) and what to do when the server session ends.
export function setHandlers(handlers) {
  onError = handlers.onError || onError;
  onSignedOut = handlers.onSignedOut || onSignedOut;
}

export class ApiError extends Error {
  constructor(message, data = {}) {
    super(message);
    this.data = data;
  }
}

const request = (path, body) =>
  fetch(`${API}/${path}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json', 'X-Requested-With': 'MindTrack' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

// InfinityFree answers with a JavaScript "browser check" page instead of our JSON whenever its __test cookie
// has expired (it lasts 6 hours). fetch() can't run that page, so load it in a hidden frame, which sets a
// fresh cookie and then shows our JSON.
const isHostCheck = (text) => /slowAES|aes\.js|__test=/.test(text);

function passHostCheck() {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.src = `${API}/data.php?check=${Date.now()}`;
    const finish = () => {
      clearTimeout(timer);
      frame.remove();
      resolve();
    };
    const timer = setTimeout(finish, 10000);
    frame.onload = () => {
      try {
        if (frame.contentDocument?.body?.textContent.trim().startsWith('{')) finish();
      } catch {
        finish();
      }
    };
    document.body.appendChild(frame);
  });
}

// Low-level request. Resolves with the JSON body (including { ok: false } answers); throws on network/server errors.
// `accept` decides whether a returned snapshot may replace the current data (used by background reloads).
export async function api(path, body, { accept = () => true } = {}) {
  let res;
  let text;
  try {
    res = await request(path, body);
    text = await res.text();
    if (isHostCheck(text)) {
      // The host check intercepts the request before it reaches PHP, so repeating it is safe.
      await passHostCheck();
      res = await request(path, body);
      text = await res.text();
    }
  } catch {
    throw new ApiError('Can’t reach MindTrack. Please check your internet connection.');
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError('MindTrack couldn’t reach its server properly. Please refresh the page and try again.');
  }
  if (res.status === 401 && db.me) {
    setDB(EMPTY);
    onSignedOut(data);
  }
  if (res.status >= 500) throw new ApiError(data.error || 'Something went wrong. Please try again.', data);
  if (data.devMail) showDevMail(data.devMail);
  if (data.db && accept()) setDB(data.db);
  return data;
}

export async function refresh() {
  await api('data.php');
  return db;
}

// ---------- Live updates ----------
// Every save on the server moves a "last change" marker (api/changes.php). Open pages poll it and reload their
// data only when it moved, so what one person does shows up for everyone within a few seconds. Polling pauses
// in background tabs and slows down when nobody is using the page, to stay light on the free hosting.
const live = { version: null, lastSync: 0, online: true, timer: null, lastActivity: Date.now(), saves: 0 };
const liveListeners = new Set();
const emitLive = () => liveListeners.forEach((l) => l());

async function reloadData() {
  // If a save finishes while this reload is in flight, its response is newer: keep it.
  const savesAtStart = live.saves;
  await api('data.php', undefined, { accept: () => live.saves === savesAtStart });
}

async function poll() {
  if (!db.me || document.visibilityState !== 'visible') return;
  try {
    const { v } = await api('changes.php');
    if (live.version !== null && v !== live.version) await reloadData();
    live.version = v;
    live.lastSync = Date.now();
    live.online = true;
  } catch {
    live.online = false;
  }
  emitLive();
}

function schedule() {
  clearTimeout(live.timer);
  const idle = Date.now() - live.lastActivity > 2 * 60000;
  live.timer = setTimeout(async () => {
    await poll();
    schedule();
  }, idle ? 20000 : 5000);
}

export function startLiveSync() {
  if (live.started) return;
  live.started = true;
  const wake = () => {
    live.lastActivity = Date.now();
  };
  ['pointerdown', 'keydown', 'scroll'].forEach((e) => window.addEventListener(e, wake, { passive: true }));
  // Coming back to the tab: check straight away instead of waiting for the next tick.
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && poll());
  window.addEventListener('online', poll);
  poll();
  schedule();
}

export function useLiveStatus() {
  useSyncExternalStore(
    (l) => {
      liveListeners.add(l);
      return () => liveListeners.delete(l);
    },
    () => `${live.online}|${live.lastSync}`,
  );
  return { online: live.online, lastSync: live.lastSync };
}

// Runs a data action. Returns the action's result; failures are reported through onError and rethrown.
// With { quiet: true } the caller shows the error itself (e.g. next to a form field).
export async function call(action, payload = {}, { quiet = false } = {}) {
  try {
    const data = await api('action.php', { action, ...payload });
    live.saves++;
    // Our own save already returned fresh data; remember its marker so the next poll doesn't reload again.
    if (data.v) live.version = data.v;
    if (!data.ok) throw new ApiError(data.error, data);
    return data.result;
  } catch (e) {
    if (!quiet) onError(e);
    throw e;
  }
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDB() {
  useSyncExternalStore(subscribe, () => version);
  return db;
}
