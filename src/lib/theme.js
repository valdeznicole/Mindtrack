import { useSyncExternalStore } from 'react';

// Appearance for the signed-in portals: 'system' (follow the device), 'light' or 'dark'. Remembered per browser.
// The sign-in and About pages keep their own light design, so the theme is only applied while signed in.
const KEY = 'mindtrack.theme';
const listeners = new Set();
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
let active = false;

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export const resolvedTheme = (pref = getThemePref()) => (pref === 'system' ? (media?.matches ? 'dark' : 'light') : pref);

function apply() {
  const root = document.documentElement;
  if (active && resolvedTheme() === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', root.dataset.theme === 'dark' ? '#0f1512' : '#F8FAF8');
  listeners.forEach((l) => l());
}

media?.addEventListener?.('change', apply);

// Turn theming on while signed in, off (light) when signed out.
export function setThemeActive(on) {
  active = on;
  apply();
}

export function setThemePref(pref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* not remembered, still applied now */
  }
  apply();
}

// Current preference and the theme actually shown.
export function useTheme() {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => `${getThemePref()}|${resolvedTheme()}|${active}`,
  );
  return { pref: getThemePref(), theme: resolvedTheme() };
}
