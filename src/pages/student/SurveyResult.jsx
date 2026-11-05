import { useDB } from '../../lib/store';
import { MOOD, ACTIVITIES } from '../../lib/moods';
import { statusFor } from '../../lib/scoring';
import { fmtDate } from '../../lib/dates';
import { moodSeries } from '../../lib/selectors';
import { Card, EmptyState, LinkButton, ProgressRing, SectionTitle, Emoji } from '../../components/ui';
import { SupportInfo } from '../../components/common';
import { AreaChart, MOOD_TICKS, moodValueLabel } from '../../components/charts';

export default function SurveyResult({ user, params }) {
  const db = useDB();
  const r = db.surveyResponses.find((x) => x.id === params.id && x.user_id === user.id);
  if (!r) return <EmptyState emoji="🔍" title="Result not found" action={<LinkButton to="/s/progress">Go to My Progress</LinkButton>} />;

  const st = statusFor(r.score);
  const m = MOOD[st.tone];
  const recs = r.score < 65 || r.flagged ? ['breathe', 'journal', 'appointment'] : ['breathe', 'journal', 'challenge'];

  return (
    <div className="result">
      <Card className="result-hero tint-gradient" style={{ '--tint': m.soft }}>
        <p className="eyebrow">Survey Complete</p>
        <h1>Your responses have been recorded.</h1>
        <ProgressRing value={r.score} size={170} stroke={16} color={m.ink} label={`Wellness check score ${r.score} out of 100`}>
          <span className="ring-value">{r.score}</span>
          <span className="ring-max">/ 100</span>
        </ProgressRing>
        <h2>Your Wellness Check</h2>
        <span className="pill lg" style={{ background: m.soft, color: m.ink }}>
          {st.label}
        </span>
        <p className="muted small">Completed {fmtDate(r.date)} · Self-reported wellness score, not a clinical diagnosis.</p>
      </Card>

      {r.flagged && (
        <Card className="flag-note">
          <h2 className="h3"><Emoji e="💚" /> Your responses may benefit from a conversation with a guidance counselor.</h2>
          <p>Talking with someone can make things feel more manageable. A counselor from the guidance office may reach out to check in with you, and you’re always welcome to book a time yourself.</p>
          <LinkButton to="/s/appointments/book">Book a Counseling Session</LinkButton>
          <details className="support-details">
            <summary>Need support right now?</summary>
            <SupportInfo />
          </details>
        </Card>
      )}

      <div className="grid-2">
        <Card>
          <SectionTitle>Areas for reflection</SectionTitle>
          {r.areas?.length ? (
            <>
              <p className="muted small">These areas might be worth a little extra care right now:</p>
              <div className="chip-row">
                {r.areas.map((a) => (
                  <span key={a} className="chip static">
                    <Emoji e="🌿" /> {a}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Nothing stood out — keep doing what’s working for you. <Emoji e="🌱" /></p>
          )}
        </Card>
        <Card>
          <SectionTitle>Mood trend</SectionTitle>
          <AreaChart data={moodSeries(db, user.id, 7)} yTicks={MOOD_TICKS} height={160} ariaLabel="Mood trend over the last 7 days" formatValue={moodValueLabel} />
        </Card>
      </div>

      <Card>
        <SectionTitle>Recommended activities</SectionTitle>
        <div className="quick-grid">
          {recs.map((k) => (
            <a key={k} href={`#${ACTIVITIES[k].to}`} className="activity-card" style={{ '--tint': ACTIVITIES[k].color }}>
              <span className="activity-emoji" aria-hidden="true">
                <Emoji e={ACTIVITIES[k].emoji} />
              </span>
              <span className="activity-title">
                {k === 'breathe' ? 'Try Guided Breathing' : k === 'journal' ? 'Write in Your Journal' : k === 'appointment' ? 'Book a Counseling Session' : ACTIVITIES[k].title}
              </span>
            </a>
          ))}
        </div>
      </Card>

      <div className="btn-row center">
        <LinkButton to="/s/home">Back to Dashboard</LinkButton>
        <LinkButton to="/s/progress" variant="ghost">
          View My Progress
        </LinkButton>
      </div>
    </div>
  );
}
