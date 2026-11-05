import { createRoot } from 'react-dom/client';
import { refresh } from './lib/store';
import App from './App';
import './styles.css';

const root = createRoot(document.getElementById('root'));

// The launch screen in index.html plays its 8-second intro once per visit; later reloads in the same tab
// only show it until the app is ready.
const LAUNCH_MS = 8000;
const RELOAD_MS = 1500;
function hideLaunch() {
  const launch = document.getElementById('launch');
  if (!launch) return;
  let seen = true;
  try {
    seen = sessionStorage.getItem('mindtrack.launchSeen') === '1';
    sessionStorage.setItem('mindtrack.launchSeen', '1');
  } catch {
    /* no session storage: skip the wait */
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A reload shows the looping ribbon for at least one full sweep, so it never just flashes by.
  const wait = reduced ? 0 : Math.max(0, (seen ? RELOAD_MS : LAUNCH_MS) - performance.now());
  setTimeout(() => {
    launch.classList.add('done');
    setTimeout(() => launch.remove(), 500);
  }, wait);
}

async function start() {
  try {
    await refresh();
    root.render(<App />);
    hideLaunch();
  } catch (e) {
    console.error(e);
    root.render(
      <div className="boot" role="alert">
        <p>MindTrack couldn’t start. {e.message}</p>
      </div>,
    );
    hideLaunch();
  }
}

start();

// Lets phones and computers install MindTrack as an app (see public/manifest.json and public/sw.js).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
