import { useDB } from '../../lib/store';
import { greeting, todayISO, fmtLong, fmtTime, timeAgo, fmtDate } from '../../lib/dates';
import { byId, students, apptSort, fullName, activeFlags } from '../../lib/selectors';
import { moodStats, checkinRate, avgMoodSeries } from '../../lib/analytics';
import { MOOD } from '../../lib/moods';
import { Card, EmptyState, PageSkeleton, SectionTitle, StatusPill, useReady, MoodIcon, Emoji } from '../../components/ui';
import { AreaChart, Donut, MOOD_TICKS, moodValueLabel } from '../../components/charts';

// Summary tile: label on top, big number, optional note. Linked tiles show an arrow.
export function StatCard({ label, value, tint, href, note }) {
  const Tag = href ? 'a' : 'div';
  return (
    <Tag className="stat-card" style={{ '--tint': tint }} href={href ? `#${href}` : undefined}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {note && <span className="stat-note">{note}</span>}
      {href && (
        <span className="stat-arrow" aria-hidden="true">
          →
        </span>
      )}
    </Tag>
  );
}

export default function Dashboard({ user }) {
  const db = useDB();
  const ready = useReady();
  if (!ready) return <PageSkeleton />;

  const today = todayISO();
  const total = students(db).length;
  const todays = db.appointments.filter((a) => a.date === today && (a.status === 'confirmed' || a.status === 'pending' || a.status === 'completed')).sort(apptSort);
  const pending = db.appointments.filter((a) => a.status === 'pending' && a.date >= today).length;
  const reviews = activeFlags(db).filter((f) => f.status !== 'reviewed');
  const stats = moodStats(db, 1);
  const week = moodStats(db, 7);
  const shownStats = stats.total ? stats : week;
  const shared = db.journals.filter((j) => j.is_shared).sort((a, b) => b.shared_at - a.shared_at).slice(0, 3);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="muted">{fmtLong(today)}</p>
          <h1>{greeting()}, Counselor</h1>
          <p className="subtitle">Here’s your guidance overview.</p>
        </div>
      </header>

      <div className="stat-grid">
        <StatCard label="Total Students" value={total.toLocaleString()} tint="var(--blue-2)" href="/c/students" />
        <StatCard label="Today’s Appointments" value={todays.length} tint="#E4F0E8" href="/c/appointments" />
        <StatCard label="Pending Requests" value={pending} tint="#FEEBD1" href="/c/appointments" />
        <StatCard label="Wellness Reviews" value={reviews.length} tint="#F8E7EC" href="/c/review" />
      </div>

      <div className="dash-grid">
        <Card className="span-2">
          <SectionTitle action={<a href="#/c/mood" className="text-link">Details →</a>}>Daily Mood Overview</SectionTitle>
          <p className="muted small">{stats.total ? `${stats.total} check-ins today` : `No check-ins yet today — showing the past 7 days (${week.total} check-ins)`}. Aggregated; no individual students shown.</p>
          <div className="donut-row">
            <Donut
              data={shownStats.breakdown.map((b) => ({ label: b.label, value: b.count, color: b.color }))}
              ariaLabel={shownStats.breakdown.map((b) => `${b.label} ${b.pct}%`).join(', ')}
              center={
                <>
                  <strong>{checkinRate(db, 7)}%</strong>
                  <span>weekly check-in rate</span>
                </>
              }
            />
            <ul className="pct-list">
              {shownStats.breakdown.map((b) => (
                <li key={b.key}>
                  <MoodIcon mood={b.key} size={22} />
                  <span>{b.label}</span>
                  <strong>{b.pct}%</strong>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <SectionTitle action={<a href="#/c/appointments" className="text-link">Calendar →</a>}>Today’s Sessions</SectionTitle>
          {todays.length ? (
            <ul className="mini-appts">
              {todays.map((a) => {
                const s = byId(db, a.student_id);
                return (
                  <li key={a.id}>
                    <span className="mini-time">{fmtTime(a.time)}</span>
                    <span>
                      <strong>{fullName(s)}</strong>
                      <span className="muted small">#{s.student_id}</span>
                    </span>
                    <StatusPill status={a.status} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState emoji="☕" title="No sessions today" />
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle>Recent Mood Trends</SectionTitle>
        <p className="muted small">Average of all student check-ins per day, last 30 days.</p>
        <AreaChart data={avgMoodSeries(db, 30)} yTicks={MOOD_TICKS} height={220} ariaLabel="Average student mood, last 30 days" formatValue={moodValueLabel} color="#6E9EAA" />
      </Card>

      <div className="grid-2">
        <Card>
          <SectionTitle action={<a href="#/c/review" className="text-link">All →</a>}>Needs Review</SectionTitle>
          {reviews.length ? (
            <ul className="list-rows">
              {reviews.slice(0, 4).map((f) => {
                const s = byId(db, f.user_id);
                return (
                  <li key={f.id}>
                    <a href={`#/c/students/${s.id}?tab=flags`} className="list-row">
                      <span className="flag-icon" aria-hidden="true">
                        <Emoji e="🚩" />
                      </span>
                      <span>
                        <strong>Student #{s.student_id}</strong>
                        <span className="muted small">
                          {f.source} · {timeAgo(f.created_at)}
                        </span>
                      </span>
                      <StatusPill status={f.status} />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState emoji="🌿" title="Nothing to review" />
          )}
        </Card>
        <Card>
          <SectionTitle action={<a href="#/c/journals" className="text-link">All →</a>}>Journals Shared With You</SectionTitle>
          {shared.length ? (
            <ul className="list-rows">
              {shared.map((j) => {
                const s = byId(db, j.user_id);
                return (
                  <li key={j.id}>
                    <a href={`#/c/journals?open=${j.id}`} className="list-row">
                      {MOOD[j.mood] ? <MoodIcon mood={j.mood} size={32} /> : <span aria-hidden="true"><Emoji e="📝" /></span>}
                      <span>
                        <strong>{j.title}</strong>
                        <span className="muted small">
                          {fullName(s)} · {fmtDate(j.date, { month: 'short', day: 'numeric' })}
                        </span>
                      </span>
                      <span aria-hidden="true">→</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState emoji="📝" title="No shared entries" />
          )}
        </Card>
      </div>
    </>
  );
}
