import { useState } from 'react';
import { useDB } from '../../lib/store';
import { moodStats, checkinRate, dailyCheckins, avgMoodSeries } from '../../lib/analytics';
import { students } from '../../lib/selectors';
import { addDays, todayISO } from '../../lib/dates';
import { FACTORS } from '../../lib/moods';
import { Card, PageHeader, SectionTitle, Segmented } from '../../components/ui';
import { AreaChart, BarChart, Donut, HBars, MOOD_TICKS, moodValueLabel } from '../../components/charts';
import { StatCard } from './Dashboard';

export default function MoodOverview() {
  const db = useDB();
  const [range, setRange] = useState(7);
  const stats = moodStats(db, range);
  const today = moodStats(db, 1);

  // Mood factors only from students who opted in to sharing details.
  const sharing = new Set(students(db).filter((s) => s.settings?.privacy?.share_mood_notes).map((s) => s.id));
  const since = addDays(todayISO(), -range + 1);
  const factorCounts = {};
  db.moods.filter((m) => sharing.has(m.user_id) && m.date >= since).forEach((m) => m.mood_factors.forEach((f) => (factorCounts[f] = (factorCounts[f] || 0) + 1)));
  const factorItems = FACTORS.map((f) => ({ label: f.label, emoji: f.emoji, value: factorCounts[f.key] || 0, color: 'var(--sage)' })).filter((f) => f.value > 0).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Daily Mood Overview" subtitle="Aggregated student check-ins. Individual students are not identified here." />
      <div className="stat-grid">
        <StatCard label="Today’s Check-Ins" value={today.total} tint="#E4F0E8" />
        <StatCard label="Weekly Check-In Rate" value={`${checkinRate(db, 7)}%`} tint="var(--blue-2)" note="Daily check-ins ÷ students, last 7 days" />
        <StatCard label="Check-Ins This Period" value={stats.total} tint="#FAF5D6" />
        <StatCard label="Students" value={students(db).length} tint="#EEE8F4" />
      </div>

      <Card>
        <SectionTitle
          action={
            <Segmented
              label="Range"
              value={range}
              onChange={setRange}
              options={[
                { value: 1, label: 'Today' },
                { value: 7, label: '7 Days' },
                { value: 30, label: '30 Days' },
              ]}
            />
          }
        >
          Mood distribution
        </SectionTitle>
        {stats.total ? (
          <div className="donut-row">
            <Donut
              data={stats.breakdown.map((b) => ({ label: b.label, value: b.count, color: b.color }))}
              ariaLabel={stats.breakdown.map((b) => `${b.label} ${b.pct}%`).join(', ')}
              center={
                <>
                  <strong>{stats.total}</strong>
                  <span>check-ins</span>
                </>
              }
            />
            <HBars items={stats.breakdown.map((b) => ({ label: b.label, mood: b.key, value: b.pct, color: b.color, display: `${b.pct}%` }))} max={100} />
          </div>
        ) : (
          <p className="muted">No check-ins in this period.</p>
        )}
      </Card>

      <div className="grid-2">
        <Card>
          <SectionTitle>Check-ins per day</SectionTitle>
          <BarChart data={dailyCheckins(db, 7)} ariaLabel="Number of check-ins per day, last 7 days" color="#B7D0D4" />
        </Card>
        <Card>
          <SectionTitle>Average mood · 30 days</SectionTitle>
          <AreaChart data={avgMoodSeries(db, 30)} yTicks={MOOD_TICKS} height={200} ariaLabel="Average mood, last 30 days" formatValue={moodValueLabel} color="#6E9EAA" />
        </Card>
      </div>

      <Card>
        <SectionTitle>Common mood factors</SectionTitle>
        <p className="muted small">From {sharing.size} student{sharing.size === 1 ? '' : 's'} who chose to share mood details.</p>
        {factorItems.length ? <HBars items={factorItems} /> : <p className="muted">No shared mood factors in this period.</p>}
      </Card>
    </>
  );
}
