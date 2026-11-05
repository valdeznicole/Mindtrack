import { useState } from 'react';
import { useDB } from '../../lib/store';
import { MOODS } from '../../lib/moods';
import { addDays, fmtDate, todayISO } from '../../lib/dates';
import { moodSeries, wellnessOf, moodDistribution } from '../../lib/selectors';
import { statusFor } from '../../lib/scoring';
import { Card, EmptyState, LinkButton, PageHeader, SectionTitle, Segmented, Emoji } from '../../components/ui';
import { WellnessScoreCard } from '../../components/common';
import { AreaChart, HBars, MOOD_TICKS, moodValueLabel } from '../../components/charts';

const RANGES = [
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '3 Months' },
];

export default function Progress({ user }) {
  const db = useDB();
  const [range, setRange] = useState(30);
  const series = moodSeries(db, user.id, range);
  const { current, previous, rows } = wellnessOf(db, user.id);
  const since = addDays(todayISO(), -range + 1);
  const moods = db.moods.filter((m) => m.user_id === user.id && m.date >= since);
  const dist = moodDistribution(moods);
  const surveys = db.surveyResponses.filter((r) => r.user_id === user.id).sort((a, b) => b.submitted_at - a.submitted_at);
  const acts = db.activities.filter((a) => a.user_id === user.id && a.date >= since);
  const count = (t) => acts.filter((a) => a.activity_type === t).length;

  return (
    <>
      <PageHeader title="My Progress" subtitle="See how your daily check-ins have changed over time." />

      <Card>
        <SectionTitle action={<Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />}>Your Mood Journey</SectionTitle>
        <p className="muted small">{range === 90 ? 'Weekly average of your check-ins.' : 'Each point is one daily check-in. Gaps are days without a check-in.'}</p>
        <AreaChart data={series} yTicks={MOOD_TICKS} height={260} ariaLabel={`Mood journey, last ${range} days`} formatValue={moodValueLabel} />
        <p className="tiny muted">This chart reflects your own check-ins. It is not a diagnosis.</p>
      </Card>

      <div className="grid-2">
        <WellnessScoreCard current={current} previous={previous} />
        <Card>
          <SectionTitle>Wellness indicator over time</SectionTitle>
          {rows.length > 1 ? (
            <AreaChart
              data={rows.slice(-10).map((r) => ({ label: fmtDate(r.date, { month: 'short', day: 'numeric' }), value: r.score }))}
              min={0}
              max={100}
              height={200}
              color="#8C7BB0"
              yTicks={[
                { value: 100, label: '100' },
                { value: 50, label: '50' },
                { value: 0, label: '0' },
              ]}
              ariaLabel="Wellness indicator history"
              formatValue={(v) => `${v} · ${statusFor(v).label}`}
            />
          ) : (
            <p className="muted">Your history will appear after a few check-ins.</p>
          )}
        </Card>
      </div>

      <div className="grid-2">
        <Card>
          <SectionTitle>Mood breakdown</SectionTitle>
          {moods.length ? (
            <HBars
              items={MOODS.map((m) => ({ label: m.label, mood: m.key, value: dist[m.key] || 0, color: m.color, display: `${dist[m.key] || 0} day${dist[m.key] === 1 ? '' : 's'}` }))}
              max={Math.max(...Object.values(dist))}
            />
          ) : (
            <p className="muted">No check-ins in this period.</p>
          )}
          <p className="small muted">
            {moods.length} check-in{moods.length === 1 ? '' : 's'} in the selected period.
          </p>
        </Card>
        <Card>
          <SectionTitle>Wellness activities</SectionTitle>
          <div className="mini-stats">
            <div style={{ '--tint': 'var(--blue-2)' }}>
              <span aria-hidden="true"><Emoji e="🫁" /></span>
              <strong>{count('breathing')}</strong>
              <span>Breathing</span>
            </div>
            <div style={{ '--tint': '#EEE8F4' }}>
              <span aria-hidden="true"><Emoji e="🫧" /></span>
              <strong>{count('bubble_pop')}</strong>
              <span>Bubble Wrap</span>
            </div>
            <div style={{ '--tint': '#FEEBD1' }}>
              <span aria-hidden="true"><Emoji e="🌱" /></span>
              <strong>{count('challenge')}</strong>
              <span>Challenges</span>
            </div>
            <div style={{ '--tint': '#FAF5D6' }}>
              <span aria-hidden="true"><Emoji e="📝" /></span>
              <strong>{count('journal')}</strong>
              <span>Journal</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle action={<LinkButton to="/s/survey" size="sm" variant="secondary">Take a Wellness Check</LinkButton>}>Wellness Check history</SectionTitle>
        {surveys.length ? (
          <ul className="list-rows">
            {surveys.map((s) => (
              <li key={s.id}>
                <a href={`#/s/survey/result/${s.id}`} className="list-row">
                  <span className="score-chip">{s.score}</span>
                  <span>
                    <strong>{statusFor(s.score).label}</strong>
                    <span className="muted small">{fmtDate(s.date)}</span>
                  </span>
                  <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState emoji="📋" title="No wellness checks yet" message="A Wellness Check takes about 2 minutes." />
        )}
      </Card>
    </>
  );
}
