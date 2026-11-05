import { useEffect, useState } from 'react';
import { Logo } from '../../components/brand';
import { useDB } from '../../lib/store';
import { Emoji } from '../../components/ui';
import WelcomeIllustration, { ExpandedHairAccents } from './WelcomeIllustration';
import './Welcome.css';
import './AuthShell.css';

// The intro panel can be expanded to fill the whole screen (the sign-in side slides away); a button brings the
// split view back. Remembered for this browser tab, so it stays put while moving between sign-in screens.
const INTRO_KEY = 'mindtrack.introFull';
const readIntroFull = () => {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
};

// The intro panel only exists on wide screens (see the 1023px breakpoint in styles.css).
const WIDE = '(min-width: 1024px)';
function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function AuthShell({ children, title }) {
  const [introFull, setIntroFull] = useState(readIntroFull);
  const wide = useWide();
  const toggleIntro = () => {
    setIntroFull((v) => {
      try {
        sessionStorage.setItem(INTRO_KEY, v ? '0' : '1');
      } catch {
        /* not remembered, still works on this screen */
      }
      return !v;
    });
  };

  return (
    <div className={`auth auth-reference ${introFull ? 'intro-full' : ''}`}>
      <aside className="auth-art" aria-label="About MindTrack">
        <div className="auth-reference-scene" aria-hidden="true"><WelcomeIllustration stationaryPortrait /></div>
        <ExpandedHairAccents />
        <div className="auth-art-copy">
          <a href="#/" aria-label="MindTrack home" className="auth-art-logo">
            <Logo />
          </a>
          <div className="auth-art-text">
            <p className="auth-eyebrow">SMCBI Guidance Office</p>
            <p className="auth-tagline">
              <span>Understand your mood.</span>
              <span>Take a moment.</span>
              <span className="accent">Stay connected.</span>
            </p>
            <p className="auth-sub">The SMCBI guidance wellness companion.</p>
          </div>
        </div>
      </aside>
      <button
        type="button"
        className="intro-toggle"
        onClick={toggleIntro}
        aria-controls="auth-signin"
        aria-expanded={!introFull}
        aria-label={introFull ? 'Show sign in' : 'Expand the MindTrack introduction to full screen'}
        title={introFull ? 'Show sign in' : 'Full-screen intro'}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d={introFull ? 'M14.5 6l-6 6 6 6' : 'M9.5 6l6 6-6 6'} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="intro-toggle-label">{introFull ? 'Sign in' : 'Expand'}</span>
      </button>
      <div className="auth-form-col" id="auth-signin" inert={introFull && wide}>
        <div className="auth-mobile-logo">
          <a href="#/" aria-label="MindTrack home">
            <Logo />
          </a>
        </div>
        <main className="auth-form" aria-label={title}>
          {children}
        </main>
      </div>
      <DemoInbox />
    </div>
  );
}

// Only appears while the server runs with MAIL_MODE = 'show' (testing before email is set up):
// the API returns the code instead of emailing it.
function DemoInbox() {
  const db = useDB();
  const mail = db.outbox[0];
  const [dismissed, setDismissed] = useState(null);
  const fresh = mail && Date.now() - mail.at < 10 * 60000;
  if (!fresh || dismissed === mail.id) return null;
  return (
    <aside className="demo-inbox" aria-live="polite" aria-label="Demo inbox">
      <div className="demo-inbox-head">
        <span><Emoji e="📬" /> Test mode inbox</span>
        <button className="icon-btn" aria-label="Dismiss test inbox" onClick={() => setDismissed(mail.id)}>
          ✕
        </button>
      </div>
      <p className="small muted">To: {mail.to}</p>
      <p>
        <strong>{mail.subject}</strong>
      </p>
      <p>
        Your code is <span className="demo-code">{mail.code}</span>
      </p>
      <p className="tiny muted">Email sending isn’t set up yet, so the code is shown here. Set MAIL_MODE to 'smtp' on the server to email it instead.</p>
    </aside>
  );
}
