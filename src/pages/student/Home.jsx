import { useDB } from '../../lib/store';
import { greeting, fmtLong, fmtDate, fmtTime, todayISO } from '../../lib/dates';
import { MOODS, MOOD, ACTIVITIES, recommendationsFor } from '../../lib/moods';
import { moodSeries, todayMoodOf, wellnessOf, upcomingOf, byId } from '../../lib/selectors';
import { dailyChallenges, isChallengeDone } from '../../lib/actions';
import { Card, LinkButton, PageSkeleton, SectionTitle, StatusPill, useReady, MoodIcon, Emoji } from '../../components/ui';
import { ActivityCard, WellnessScoreCard } from '../../components/common';
import { AreaChart, MOOD_TICKS, moodValueLabel } from '../../components/charts';
import { navigate } from '../../lib/router';

export default function Home({ user }) {
  const db = useDB();
  const ready = useReady();
  if (!ready) return <PageSkeleton />;

  const today = todayMoodOf(db, user.id);
  const { current, previous } = wellnessOf(db, user.id);
  const series = moodSeries(db, user.id, 7);
  const next = upcomingOf(db, user.id)[0];
  const challenges = dailyChallenges(db);
  const done = challenges.filter((c) => isChallengeDone(db, user.id, c.id)).length;
  const firstOpen = challenges.find((c) => !isChallengeDone(db, user.id, c.id)) || challenges[0];
  const rec = recommendationsFor(today?.mood || 'good');

  return (
    <>
      <header className="page-header home-header">
        <div>
          <p className="muted">{fmtLong(todayISO())}</p>
          <h1>
            {greeting()}, {user.first_name} <Emoji e="👋" />
          </h1>
          <p className="subtitle">How are you feeling today?</p>
        </div>
      </header>

      <div className="dash-grid">
        <Card className="mood-hero span-2" aria-labelledby="today-mood">
          {today ? (
            <div className="mood-done" style={{ '--tint': MOOD[today.mood].soft }}>
              <div className="mood-done-emoji">
                <MoodIcon mood={today.mood} size={96} />
              </div>
              <div>
                <h2 id="today-mood">You’re feeling {MOOD[today.mood].label.toLowerCase()} today</h2>
                <p className="muted">Checked in at {fmtTime(today.time)}. Thank you for taking a moment for yourself.</p>
                <div className="btn-row">
                  <LinkButton to="/s/mood?view=today" variant="secondary" size="sm">
                    View Today’s Check-In
                  </LinkButton>
                  <LinkButton to="/s/mood?edit=1" variant="ghost" size="sm">
                    Update Mood
                  </LinkButton>
                </div>
              </div>
            </div>
          ) : (
            <>
              <h2 id="today-mood">How are you feeling today?</h2>
              <p className="muted">Take a moment to check in with yourself.</p>
              <div className="mood-quick" role="group" aria-label="Choose your mood">
                {MOODS.map((m) => (
                  <button key={m.key} className="mood-quick-btn" style={{ '--mood': m.color, '--mood-soft': m.soft }} onClick={() => navigate(`/s/mood?m=${m.key}`)}>
                    <MoodIcon mood={m.key} size={72} className="mq-emoji" />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <WellnessScoreCard current={current} previous={previous} compact />

        <Card className="span-2">
          <SectionTitle
            action={
              <a href="#/s/progress" className="text-link">
                See more →
              </a>
            }
          >
            Mood Trend
          </SectionTitle>
          <p className="muted small">Your last 7 days of check-ins.</p>
          <AreaChart data={series} yTicks={MOOD_TICKS} height={190} ariaLabel="Mood trend over the last 7 days" formatValue={moodValueLabel} />
        </Card>

        <Card className="challenge-card">
          <SectionTitle>Today’s Challenge <Emoji e="🌱" /></SectionTitle>
          {firstOpen ? (
            <>
              <div className="challenge-hero">
                <span aria-hidden="true"><Emoji e={firstOpen.emoji} /></span>
                <p>{firstOpen.title}</p>
              </div>
              <div className="progress-line" role="progressbar" aria-valuemin={0} aria-valuemax={challenges.length} aria-valuenow={done} aria-label="Challenges completed today">
                <span style={{ width: `${(done / Math.max(1, challenges.length)) * 100}%` }} />
              </div>
              <p className="small muted">
                {done} / {challenges.length} completed
              </p>
              <LinkButton to="/s/challenges" variant="secondary" size="sm">
                View challenges
              </LinkButton>
            </>
          ) : (
            <p className="muted">No challenges today — enjoy your day!</p>
          )}
        </Card>
      </div>

      <SectionTitle>Quick Actions</SectionTitle>
      <div className="quick-grid">
        {['breathe', 'bubbles', 'journal', 'survey', 'appointment'].map((k) => (
          <ActivityCard key={k} k={k} />
        ))}
      </div>

      <div className="grid-2">
        <Card>
          <SectionTitle>Recommended for you</SectionTitle>
          <p className="muted">{today ? rec.message : 'Small moments of care add up.'}</p>
          <ul className="rec-list">
            {rec.items.map((k) => (
              <li key={k}>
                <a href={`#${ACTIVITIES[k].to}`} className="rec-item" style={{ '--tint': ACTIVITIES[k].color }}>
                  <span aria-hidden="true"><Emoji e={ACTIVITIES[k].emoji} /></span>
                  <span>
                    <strong>{ACTIVITIES[k].title}</strong>
                    <span className="muted small">{ACTIVITIES[k].text}</span>
                  </span>
                  <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="tiny muted">Recommendations are optional — do what feels right for you.</p>
        </Card>

        <Card>
          <SectionTitle
            action={
              <a href="#/s/appointments" className="text-link">
                All →
              </a>
            }
          >
            Upcoming Appointment
          </SectionTitle>
          {next ? (
            <div className="next-appt">
              <div className="appt-date big" aria-hidden="true">
                <span>{fmtDate(next.date, { month: 'short' })}</span>
                <strong>{Number(next.date.slice(8))}</strong>
              </div>
              <div>
                <h3>Guidance Counseling</h3>
                <p>
                  {fmtDate(next.date, { weekday: 'long', month: 'long', day: 'numeric' })} · {fmtTime(next.time)}
                </p>
                <p className="muted small">with {byId(db, next.counselor_id)?.first_name} {byId(db, next.counselor_id)?.last_name}</p>
                <StatusPill status={next.status} />
              </div>
            </div>
          ) : (
            <div className="empty-inline">
              <p className="muted">No upcoming sessions. Talking to someone can help — whenever you’re ready.</p>
              <LinkButton to="/s/appointments/book" variant="secondary" size="sm">
                Book a session
              </LinkButton>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
