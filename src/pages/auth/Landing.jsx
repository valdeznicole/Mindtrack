import { Logo } from '../../components/brand';
import { MoodIcon, Emoji } from '../../components/ui';
import { MOODS } from '../../lib/moods';
import { SCHOOL } from '../../config';
import { HotlineNumbers } from '../../components/common';
import { useMediaPreference } from './Welcome';
import WelcomeIllustration from './WelcomeIllustration';
import './Welcome.css';
import './About.css';

// About MindTrack (/#/about). Shares the welcome and sign-in look: the flowing emerald illustration,
// cream background and mint accents, plus the mood characters and Fluent emoji.

const STUDENT_FEATURES = [
  { emoji: '💚', title: 'Daily Mood Check-In', text: 'Pick the face that fits your day, add a note or what affected your mood. It takes a few seconds.', tint: 'var(--sage)' },
  { emoji: '📊', title: 'My Progress', text: 'See your mood trend over 7 days, 30 days or 3 months, plus a self-reported wellness indicator.', tint: 'var(--blue)' },
  { emoji: '🫁', title: 'Wellness Space', text: 'Guided breathing, a relaxing sheet of bubble wrap to pop, and three small daily challenges.', tint: 'var(--lavender)' },
  { emoji: '📋', title: 'Wellness Check', text: 'A few short reflection questions. Your results show where extra support could help.', tint: 'var(--cream)' },
  { emoji: '📝', title: 'Private Journal', text: 'Write freely. Entries stay private unless you choose to share one with your counselor.', tint: 'var(--pink)' },
  { emoji: '📅', title: 'Online Appointments', text: 'Book, reschedule or cancel a guidance session online, with reminders. No walk-in needed.', tint: 'var(--orange)' },
];

const COUNSELOR_FEATURES = [
  { emoji: '🏠', title: 'At-a-glance dashboard', text: 'Today’s sessions, pending requests, review flags and the overall mood of the school.' },
  { emoji: '🚩', title: 'Needs Review', text: 'Students whose check-ins or Wellness Check meet the school’s criteria are flagged for a gentle follow-up.' },
  { emoji: '🗓️', title: 'Appointments calendar', text: 'Open available times, block days, and confirm or complete sessions with private notes.' },
  { emoji: '📈', title: 'Mood & wellness overviews', text: 'Anonymous, school-wide trends by day, week and month, without singling anyone out.' },
  { emoji: '💬', title: 'Shared journals', text: 'Read only the entries a student chose to share, and reach out when it helps.' },
  { emoji: '🌱', title: 'Daily challenges', text: 'Write and rotate the small wellness challenges students see each day.' },
];

const STEPS = [
  { n: 1, title: 'Create your account', text: `Use your official lastnamefirstname@${SCHOOL.emailDomain} school email.` },
  { n: 2, title: 'Verify your email', text: 'Enter the 6-digit code we send you, then add your Student ID, year and section.' },
  { n: 3, title: 'Check in, your way', text: 'Log your mood, take a breather, write, or book a session whenever you need to.' },
];

export default function Landing() {
  const compactArtwork = useMediaPreference('(max-width: 800px)');
  return (
    <div className="about">
      {/* ---------- Hero (same layout as the welcome screen) ---------- */}
      <section className="welcome about-hero" aria-labelledby="about-title">
        <header className="welcome-header">
          <a href="#/" className="welcome-brand" aria-label="MindTrack home">
            <Logo size={42} />
          </a>
          <nav className="about-nav" aria-label="Account">
            <a href="#/login" className="about-link">
              Log in
            </a>
            <a href="#/register" className="welcome-button welcome-button-primary">
              Create account
            </a>
          </nav>
        </header>
        <div className="welcome-main">
          <div className="welcome-art" aria-hidden="true">
            <WelcomeIllustration compact={compactArtwork} />
          </div>
          <div className="welcome-copy">
            <p className="welcome-eyebrow welcome-enter">
              <span aria-hidden="true" /> FOR SMCBI STUDENTS &amp; GUIDANCE COUNSELORS
            </p>
            <h1 id="about-title" className="about-title welcome-enter">
              <span>Understand your mood.</span>
              <span>Take a moment.</span>
              <span className="welcome-heading-accent">Stay connected.</span>
            </h1>
            <p className="welcome-description welcome-enter">
              MindTrack is the SMCBI guidance wellness companion: a calm, private space to check in with yourself, take a breather, reflect, and reach the guidance office whenever you need to.
            </p>
            <div className="welcome-actions welcome-enter">
              <a className="welcome-button welcome-button-primary" href="#/register">
                Get Started
              </a>
              <a className="welcome-button welcome-button-secondary" href="#/login">
                I have an account
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="about-body">
        {/* ---------- Moods ---------- */}
        <section className="about-section about-moods" aria-labelledby="moods-title">
          <p className="eyebrow">Daily check-in</p>
          <h2 id="moods-title">How are you feeling today?</h2>
          <p className="about-section-lead">Twelve friendly faces help you name how you feel. One tap a day builds a picture of your well-being over time.</p>
          <ul className="about-mood-row">
            {MOODS.map((m, i) => (
              <li key={m.key} style={{ '--soft': m.soft, '--ink': m.ink, animationDelay: `${i * 0.08}s` }}>
                <MoodIcon mood={m.key} size={96} />
                <span>{m.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Students ---------- */}
        <section className="about-section" aria-labelledby="students-title">
          <p className="eyebrow">For students</p>
          <h2 id="students-title">Everything in one supportive place</h2>
          <div className="about-grid">
            {STUDENT_FEATURES.map((f) => (
              <article key={f.title} className="about-card" style={{ '--tint': f.tint }}>
                <span className="about-card-icon" aria-hidden="true">
                  <Emoji e={f.emoji} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- Counselors ---------- */}
        <section className="about-section about-counselors" aria-labelledby="counselors-title">
          <div className="about-split">
            <div>
              <p className="eyebrow">For guidance counselors</p>
              <h2 id="counselors-title">Support students early, without guesswork</h2>
              <p className="about-section-lead left">
                The counselor portal turns daily check-ins into gentle signals, so the guidance office can reach out early. Flags ask for a review; they are never a diagnosis.
              </p>
              <a href="#/login?role=counselor" className="welcome-button welcome-button-primary">
                Counselor log in
              </a>
            </div>
            <ul className="about-list">
              {COUNSELOR_FEATURES.map((f) => (
                <li key={f.title}>
                  <span className="about-list-icon" aria-hidden="true">
                    <Emoji e={f.emoji} />
                  </span>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- How it works + live ---------- */}
        <section className="about-section" aria-labelledby="steps-title">
          <p className="eyebrow">Getting started</p>
          <h2 id="steps-title">Three steps to your first check-in</h2>
          <ol className="about-steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="about-step-n" aria-hidden="true">
                  {s.n}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-band about-live" aria-labelledby="live-title">
          <span className="about-band-icon" aria-hidden="true">
            <span className="live-dot" />
          </span>
          <div>
            <h2 id="live-title">Always up to date</h2>
            <p>
              Changes appear for everyone within seconds, with no need to refresh. A counselor sees a new booking right away, and a student sees the confirmation the moment it’s sent.
            </p>
          </div>
        </section>

        <section className="about-band" aria-labelledby="privacy-title">
          <span className="about-band-icon lavender" aria-hidden="true">
            <Emoji e="🔒" />
          </span>
          <div>
            <h2 id="privacy-title">Private by default</h2>
            <ul className="about-checks">
              <li>Only verified @{SCHOOL.emailDomain} accounts can sign in.</li>
              <li>Your journal stays private unless you share an entry.</li>
              <li>Mood notes stay private unless you turn on sharing.</li>
              <li>Students never see each other’s data, and counselor access to profiles is logged.</li>
              <li>MindTrack never diagnoses. It helps you and your counselor stay connected.</li>
            </ul>
          </div>
        </section>

        <section className="about-band about-help" aria-labelledby="help-title">
          <span className="about-band-icon pink" aria-hidden="true">
            <Emoji e="🤝" />
          </span>
          <div>
            <h2 id="help-title">Need support right now?</h2>
            <p>
              MindTrack isn’t an emergency service. If you or someone you know is in crisis, reach out now. {SCHOOL.guidanceOffice.name}: {SCHOOL.guidanceOffice.location}, {SCHOOL.guidanceOffice.hours}.
            </p>
            <div className="about-hotlines">
              {SCHOOL.crisisLines.map((c) => (
                <div key={c.label} className="about-hotline">
                  <p className="about-hotline-title">
                    <Emoji e="📞" /> <strong>{c.label}</strong>
                  </p>
                  <HotlineNumbers numbers={c.numbers} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ---------- Closing call to action ---------- */}
      <section className="about-cta" aria-labelledby="cta-title">
        <h2 id="cta-title">Take a moment for yourself today.</h2>
        <div className="about-actions center">
          <a href="#/register" className="welcome-button welcome-button-primary">
            Create your account
          </a>
          <a href="#/" className="welcome-button welcome-button-secondary">
            Back to log in
          </a>
        </div>
      </section>

      <footer className="about-foot">
        <p>© {new Date().getFullYear()} MindTrack · SMCBI Guidance Office</p>
      </footer>
    </div>
  );
}
