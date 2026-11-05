import { useEffect, useState } from 'react';
import { Logo } from '../../components/brand';
import { Emoji } from '../../components/ui';
import { ICON_URLS } from '../../lib/emoji';
import WelcomeIllustration from './WelcomeIllustration';
import './Welcome.css';

export const ROLES = {
  student: {
    emoji: '🎓',
    title: 'Student',
    text: 'Check in with your mood, write in your journal and book a session.',
    tint: 'var(--sage)',
  },
  counselor: {
    emoji: '🧑‍💼',
    title: 'Guidance Counselor',
    text: 'Review student wellness, shared journals and appointments.',
    tint: 'var(--blue)',
  },
};

export function RoleChooser() {
  return (
    <>
      <h1>Welcome to MindTrack</h1>
      <p className="subtitle">Who’s logging in today?</p>
      <div className="role-grid">
        {Object.entries(ROLES).map(([key, r], i) => (
          <a key={key} href={`#/login?role=${key}`} className="role-card" style={{ '--tint': r.tint, animationDelay: `${0.05 + i * 0.08}s` }}>
            <span className="role-emoji" aria-hidden="true">
              <Emoji e={r.emoji} />
            </span>
            <span className="role-text">
              <strong>{r.title}</strong>
              <span>{r.text}</span>
            </span>
            <span className="role-arrow" aria-hidden="true">
              ›
            </span>
          </a>
        ))}
      </div>
      <p className="auth-switch">
        New student? <a href="#/register">Create an account</a>
      </p>
      <p className="center small">
        <a href="#/about" className="text-link">
          What is MindTrack?
        </a>
      </p>
    </>
  );
}

export function useMediaPreference(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export default function Welcome() {
  const compactArtwork = useMediaPreference('(max-width: 800px)');

  return (
    <div className="welcome">
      <a className="welcome-skip" href="#welcome-content" onClick={(event) => {
        // This app routes by hash; focusing directly avoids changing the application route.
        event.preventDefault();
        document.getElementById('welcome-content').focus();
      }}>Skip to welcome content</a>
      <header className="welcome-header">
        <a href="#/" className="welcome-brand" aria-label="MindTrack home"><Logo size={42} /></a>
        <a className="welcome-about" href="#/about">About MindTrack <span aria-hidden="true">↗</span></a>
      </header>

      <main className="welcome-main" id="welcome-content" tabIndex={-1}>
        <div className="welcome-art" aria-hidden="true">
          <WelcomeIllustration compact={compactArtwork} />
        </div>

        <section className="welcome-copy" aria-labelledby="welcome-heading">
          <p className="welcome-eyebrow welcome-enter"><span aria-hidden="true" /> YOUR SPACE TO FEEL BETTER</p>
          <h1 id="welcome-heading" className="welcome-enter">A little care for your mind,<br className="welcome-desktop-break" /> <span className="welcome-heading-accent">every day.</span></h1>
          <p className="welcome-description welcome-enter">Check in with your feelings, reflect on your day, and make space for your well-being.</p>
          <div className="welcome-actions welcome-enter">
            <a className="welcome-button welcome-button-primary" href="#/register">Get Started <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></a>
            <a className="welcome-button welcome-button-secondary" href="#/login">Sign In</a>
          </div>
          <ul className="welcome-features welcome-enter" aria-label="MindTrack features">
            <li><FeatureIcon kind="mood" />Mood Check-ins</li>
            <li><FeatureIcon kind="journal" />Personal Journal</li>
            <li><FeatureIcon kind="wellness" />Wellness Tools</li>
          </ul>
        </section>
      </main>

      <footer className="welcome-footer">
        <p><span className="welcome-footer-flower" aria-hidden="true">✳</span> Small steps. A kinder you.</p>
      </footer>
    </div>
  );
}

function FeatureIcon({ kind }) {
  const icons = { mood: 'heart', journal: 'journal', wellness: 'sprout' };
  return <img className="welcome-feature-icon" src={ICON_URLS[icons[kind]]} alt="" width="20" height="20" aria-hidden="true" draggable="false" />;
}
