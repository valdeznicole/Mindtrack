import { useState } from 'react';
import { MOODS, MOOD, FACTOR, ACTIVITIES } from '../lib/moods';
import { monthMatrix, monthLabel, todayISO, fmtLong, fmtTime, fmtDate, relDay } from '../lib/dates';
import { statusFor } from '../lib/scoring';
import { SCHOOL } from '../config';
import { Button, Modal, ProgressRing, StatusPill, MoodBadge, MoodIcon, Emoji } from './ui';

// Tap-to-call list of a crisis line's numbers (carrier label, number, optional note).
export function HotlineNumbers({ numbers }) {
  return (
    <ul className="hotline-numbers">
      {numbers.map((n) => (
        <li key={n.value}>
          <span className="hotline-carrier">{n.label}</span>
          <a href={`tel:${n.value.replace(/[^\d+]/g, '')}`} className="hotline-number">
            {n.value}
          </a>
          {n.note && <span className="hotline-note">{n.note}</span>}
        </li>
      ))}
    </ul>
  );
}

export function SupportInfo() {
  const g = SCHOOL.guidanceOffice;
  return (
    <div className="support-info">
      <p>
        If you or someone you know is in immediate danger or thinking about self-harm, please reach out right away. You don’t have to go through it
        alone.
      </p>
      <ul className="support-list">
        <li>
          <span aria-hidden="true"><Emoji e="🏫" /></span>
          <div>
            <strong>{g.name}</strong>
            <span>
              {g.location} · {g.hours}
            </span>
          </div>
        </li>
        {SCHOOL.crisisLines.map((c) => (
          <li key={c.label}>
            <span aria-hidden="true"><Emoji e="📞" /></span>
            <div>
              <strong>{c.label}</strong>
              <HotlineNumbers numbers={c.numbers} />
            </div>
          </li>
        ))}
      </ul>
      <p className="muted small">MindTrack is a wellness-support tool and does not replace professional care.</p>
    </div>
  );
}

export function SupportButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`support-btn ${className}`} onClick={() => setOpen(true)}>
        <span aria-hidden="true"><Emoji e="🤝" /></span> Need support now?
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Support is available" footer={<Button onClick={() => setOpen(false)}>Close</Button>}>
        <SupportInfo />
      </Modal>
    </>
  );
}

export function MoodCalendar({ moods, onSelect, selected }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const map = new Map(moods.map((m) => [m.date, m]));
  const today = todayISO();
  const shift = (d) => {
    const dt = new Date(ym.y, ym.m + d, 1);
    setYm({ y: dt.getFullYear(), m: dt.getMonth() });
  };
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth();
  return (
    <div className="mood-cal">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <h3 aria-live="polite">{monthLabel(ym.y, ym.m)}</h3>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month" disabled={isCurrent}>
          ›
        </button>
      </div>
      <div className="cal-grid" role="grid" aria-label={`Mood calendar, ${monthLabel(ym.y, ym.m)}`}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="cal-dow" role="columnheader">
            {d}
          </div>
        ))}
        {monthMatrix(ym.y, ym.m)
          .flat()
          .map((date, i) => {
            if (!date) return <div key={`e${i}`} className="cal-cell empty" aria-hidden="true" />;
            const m = map.get(date);
            const mood = m && MOOD[m.mood];
            const future = date > today;
            return (
              <button
                key={date}
                className={`cal-cell ${m ? 'has' : ''} ${date === today ? 'today' : ''} ${selected === date ? 'selected' : ''}`}
                style={mood ? { background: mood.soft, borderColor: mood.color } : undefined}
                disabled={future}
                onClick={() => onSelect?.(date, m)}
                aria-label={`${fmtDate(date)}: ${mood ? mood.label : 'no check-in'}`}
              >
                <span className="cal-num">{Number(date.slice(8))}</span>
                {mood && <MoodIcon mood={m.mood} size={28} className="cal-emoji" />}
              </button>
            );
          })}
      </div>
      <ul className="legend" aria-label="Mood legend">
        {MOODS.map((m) => (
          <li key={m.key}>
            <MoodIcon mood={m.key} size={22} />
            {m.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MoodDetail({ entry, showNote = true }) {
  if (!entry) return <p className="muted">No check-in on this day.</p>;
  return (
    <div className="mood-detail">
      <MoodBadge mood={entry.mood} size="lg" />
      <dl className="detail-list">
        <div>
          <dt>Date</dt>
          <dd>{fmtLong(entry.date)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{fmtTime(entry.time)}</dd>
        </div>
        {showNote && (
          <>
            <div>
              <dt>Note</dt>
              <dd>{entry.note ? `“${entry.note}”` : <span className="muted">No note added</span>}</dd>
            </div>
            <div>
              <dt>Mood factors</dt>
              <dd>
                {entry.mood_factors?.length ? (
                  <span className="chip-row">
                    {entry.mood_factors.map((f) => (
                      <span key={f} className="chip static">
                        <Emoji e={FACTOR[f]?.emoji} /> {FACTOR[f]?.label}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="muted">None selected</span>
                )}
              </dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}

export function MoodTimeline({ entries, showNotes = true }) {
  return (
    <ol className="timeline">
      {entries.map((e) => {
        const m = MOOD[e.mood];
        return (
          <li key={e.id} className="timeline-item">
            <span className="timeline-dot" style={{ background: m.color }} aria-hidden="true" />
            <div className="timeline-card" style={{ borderColor: m.color }}>
              <div className="timeline-top">
                <strong>{relDay(e.date)}</strong>
                <span className="muted small">{fmtTime(e.time)}</span>
              </div>
              <MoodBadge mood={e.mood} />
              {showNotes && e.note && <p className="timeline-note">“{e.note}”</p>}
              {showNotes && e.mood_factors?.length > 0 && (
                <div className="chip-row">
                  {e.mood_factors.map((f) => (
                    <span key={f} className="chip static small">
                      <Emoji e={FACTOR[f]?.emoji} /> {FACTOR[f]?.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function WellnessScoreCard({ current, previous, compact = false, title = 'Your Wellness' }) {
  if (!current) {
    return (
      <div className="wellness-card empty">
        <h2>{title}</h2>
        <p className="muted">Check in with your mood or take a Wellness Check to see your wellness indicator.</p>
      </div>
    );
  }
  const st = statusFor(current.score);
  const m = MOOD[st.tone];
  const delta = previous ? current.score - previous.score : null;
  return (
    <div className={`wellness-card tint-gradient ${compact ? 'compact' : ''}`} style={{ '--tint': m.soft }}>
      <div className="wellness-top">
        <h2>{title}</h2>
        <span className="pill" style={{ background: m.soft, color: m.ink }}>
          {st.label}
        </span>
      </div>
      <div className="wellness-body">
        <ProgressRing value={current.score} size={compact ? 118 : 150} stroke={compact ? 12 : 14} color={m.ink} label={`Wellness indicator ${current.score} out of 100, ${st.label}`}>
          <span className="ring-value">{current.score}</span>
          <span className="ring-max">/ 100</span>
        </ProgressRing>
        <dl className="wellness-stats">
          <div>
            <dt>Previous</dt>
            <dd>{previous ? previous.score : '—'}</dd>
          </div>
          <div>
            <dt>Trend</dt>
            <dd>
              {delta == null ? '—' : delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '● Steady'}
              <span className="sr-only">{delta > 0 ? ' up' : delta < 0 ? ' down' : ''}</span>
            </dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{fmtDate(current.date, { month: 'short', day: 'numeric' })}</dd>
          </div>
        </dl>
      </div>
      <p className="muted small disclaimer">Self-reported wellness indicator based on your recent check-ins and wellness activities. It is not a medical assessment.</p>
    </div>
  );
}

export function ActivityCard({ k, large }) {
  const a = ACTIVITIES[k];
  return (
    <a href={`#${a.to}`} className={`activity-card ${large ? 'large' : ''}`} style={{ '--tint': a.color }}>
      <span className="activity-emoji" aria-hidden="true">
        <Emoji e={a.emoji} />
      </span>
      <span className="activity-title">{a.title}</span>
      <span className="activity-text">{a.text}</span>
    </a>
  );
}

export function AppointmentCard({ appt, counselor, student, actions }) {
  return (
    <article className="appt-card">
      <div className="appt-date" aria-hidden="true">
        <span>{fmtDate(appt.date, { month: 'short' })}</span>
        <strong>{Number(appt.date.slice(8))}</strong>
      </div>
      <div className="appt-info">
        <h3>{student ? `${student.first_name} ${student.last_name}` : 'Guidance Counseling'}</h3>
        <p>
          {fmtDate(appt.date)} · {fmtTime(appt.time)}
        </p>
        <p className="muted small">{student ? `#${student.student_id} · ${student.section}` : counselor ? `with ${counselor.first_name} ${counselor.last_name}` : ''}</p>
        <StatusPill status={appt.status} />
      </div>
      {actions && <div className="appt-actions">{actions}</div>}
    </article>
  );
}
