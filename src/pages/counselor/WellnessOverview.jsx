import { useDB } from '../../lib/store';
import { students, byId, fullName } from '../../lib/selectors';
import { latestScore } from '../../lib/analytics';
import { statusFor } from '../../lib/scoring';
import { addDays, fmtDate, fmtShort, todayISO } from '../../lib/dates';
import { MOOD } from '../../lib/moods';
import { Card, PageHeader, SectionTitle, Emoji } from '../../components/ui';
import { AreaChart, BarChart } from '../../components/charts';
import { StatCard } from './Dashboard';

const BANDS = [
  { label: 'Thriving', short: 'Thriving', min: 80, tone: 'very_good' },
  { label: 'Good', short: 'Good', min: 65, tone: 'good' },
  { label: 'Doing Okay', short: 'Okay', min: 50, tone: 'okay' },
  { label: 'Could use a boost', short: 'Boost', min: 35, tone: 'stressed' },
  { label: 'Extra support may help', short: 'Support', min: 0, tone: 'sad' },
];

export default function WellnessOverview() {
  const db = useDB();
  const list = students(db);
  const scores = list.map((s) => latestScore(db, s.id)).filter(Boolean);
  const avg = scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;
  const bands = BANDS.map((b, i) => ({
    label: b.short,
    value: scores.filter((s) => s.score >= b.min && (i === 0 || s.score < BANDS[i - 1].min)).length,
    color: MOOD[b.tone].color,
  }));
  const since30 = addDays(todayISO(), -30);
  const recent = db.surveyResponses.filter((r) => r.date >= since30).sort((a, b) => b.submitted_at - a.submitted_at);
  const weeks = Array.from({ length: 8 }, (_, w) => {
    const start = addDays(todayISO(), -(8 - w) * 7 + 1);
    const end = addDays(start, 6);
    const rs = db.surveyResponses.filter((r) => r.date >= start && r.date <= end);
    return { label: fmtShort(start), value: rs.length ? Math.round(rs.reduce((a, r) => a + r.score, 0) / rs.length) : null };
  });

  return (
    <>
      <PageHeader title="Wellness Overview" subtitle="Survey results and self-reported wellness indicators across students." />
      <div className="stat-grid">
        <StatCard label="Average Wellness Indicator" value={avg} tint="#E4F0E8" note={statusFor(avg).label} />
        <StatCard label="Wellness Checks (30 days)" value={recent.length} tint="var(--blue-2)" />
        <StatCard label="Met Review Criteria (30 days)" value={recent.filter((r) => r.flagged).length} tint="#F8E7EC" href="/c/review" />
        <StatCard label="Students With Data" value={scores.length} tint="#EEE8F4" />
      </div>
      <div className="grid-2">
        <Card>
          <SectionTitle>Wellness indicator distribution</SectionTitle>
          <BarChart data={bands} ariaLabel={bands.map((b) => `${b.label}: ${b.value} students`).join(', ')} />
          <p className="tiny muted">Thriving ≥80 · Good 65–79 · Okay 50–64 · Boost 35–49 · Extra support &lt;35</p>
        </Card>
        <Card>
          <SectionTitle>Average wellness check score · weekly</SectionTitle>
          <AreaChart
            data={weeks}
            min={0}
            max={100}
            height={200}
            color="#8C7BB0"
            yTicks={[
              { value: 100, label: '100' },
              { value: 50, label: '50' },
              { value: 0, label: '0' },
            ]}
            ariaLabel="Average wellness check score per week"
          />
        </Card>
      </div>
      <Card>
        <SectionTitle>Recent survey results</SectionTitle>
        <ul className="list-rows">
          {recent.slice(0, 12).map((r) => {
            const s = byId(db, r.user_id);
            const st = statusFor(r.score);
            return (
              <li key={r.id}>
                <a href={`#/c/students/${s.id}?tab=surveys`} className="list-row">
                  <span className="score-chip" style={{ background: MOOD[st.tone].soft, color: MOOD[st.tone].ink }}>
                    {r.score}
                  </span>
                  <span>
                    <strong>{fullName(s)}</strong>
                    <span className="muted small">
                      #{s.student_id} · {fmtDate(r.date, { month: 'short', day: 'numeric' })} · {st.label}
                    </span>
                  </span>
                  {r.flagged ? <span className="pill pill-pink"><Emoji e="🚩" /> Review</span> : <span aria-hidden="true">→</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
