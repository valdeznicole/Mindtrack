import { useState } from 'react';
import { useDB } from '../../lib/store';
import { todayISO, monthMatrix, monthLabel, fmtLong, fmtTime, fmtDate, nowTime } from '../../lib/dates';
import { byId } from '../../lib/selectors';
import { addReminder, bookAppointment, rescheduleAppointment } from '../../lib/actions';
import { navigate } from '../../lib/router';
import { Alert, Button, Card, EmptyState, LinkButton, PageHeader, StatusPill, TextField, useFeedback, Emoji } from '../../components/ui';

export default function BookAppointment({ user, query }) {
  const db = useDB();
  const { toast } = useFeedback();
  const resched = query.resched ? db.appointments.find((a) => a.id === query.resched && a.student_id === user.id) : null;
  const today = todayISO();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [date, setDate] = useState(null);
  const [slotId, setSlotId] = useState(null);
  const [reason, setReason] = useState(resched?.reason || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(null);

  const open = db.slots.filter((s) => s.status === 'open' && (s.date > today || (s.date === today && s.time > nowTime())));
  const byDate = open.reduce((acc, s) => ((acc[s.date] ||= []).push(s), acc), {});
  const daySlots = (byDate[date] || []).sort((a, b) => a.time.localeCompare(b.time));

  const shift = (d) => {
    const dt = new Date(ym.y, ym.m + d, 1);
    setYm({ y: dt.getFullYear(), m: dt.getMonth() });
  };

  const submit = async () => {
    if (!slotId) return setError('Please choose a time.');
    setLoading(true);
    let res;
    try {
      res = await (resched ? rescheduleAppointment(resched.id, slotId) : bookAppointment(user.id, slotId, reason));
    } catch {
      return; // the error is shown as a toast
    } finally {
      setLoading(false);
    }
    if (!res.ok) {
      setError(res.error);
      setSlotId(null);
      return;
    }
    setBooked(res.id);
  };

  if (booked) {
    const a = db.appointments.find((x) => x.id === booked);
    const c = byId(db, a.counselor_id);
    return (
      <div className="success-view">
        <Card className="success-card">
          <div className="success-emoji pop-in" aria-hidden="true">
            <Emoji e="📅" />
          </div>
          <h1 className="h2">{resched ? 'Reschedule Requested' : 'Appointment Requested'}</h1>
          <p className="muted">The guidance office will confirm your session soon. We’ll notify you when it’s confirmed.</p>
          <dl className="detail-list boxed">
            <div>
              <dt>Date</dt>
              <dd>{fmtLong(a.date)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{fmtTime(a.time)}</dd>
            </div>
            <div>
              <dt>Counselor</dt>
              <dd>
                {c.first_name} {c.last_name}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusPill status={a.status} />
              </dd>
            </div>
          </dl>
          <div className="btn-row center">
            <Button
              variant="secondary"
              disabled={a.reminder}
              onClick={async () => {
                await addReminder(a.id);
                toast('Reminder added 🔔');
              }}
            >
              <Emoji e="🔔" /> {a.reminder ? 'Reminder added' : 'Add Reminder'}
            </Button>
            <Button onClick={() => navigate(`/s/appointments?id=${a.id}`)}>View Appointment</Button>
          </div>
        </Card>
      </div>
    );
  }

  const isCurrentMonth = ym.y === now.getFullYear() && ym.m === now.getMonth();

  return (
    <>
      <PageHeader back="/s/appointments" title={resched ? 'Reschedule Session' : 'Book a Counseling Session'} subtitle="Choose a date and time that works for you." />
      {resched && (
        <Alert tone="info" title="Rescheduling">
          Current time: {fmtLong(resched.date)} at {fmtTime(resched.time)}. Your new request will be marked pending until confirmed.
        </Alert>
      )}
      <div className="book-grid">
        <Card>
          <div className="cal-head">
            <button className="icon-btn" onClick={() => shift(-1)} disabled={isCurrentMonth} aria-label="Previous month">
              ‹
            </button>
            <h2 className="h3" aria-live="polite">
              {monthLabel(ym.y, ym.m)}
            </h2>
            <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
              ›
            </button>
          </div>
          <div className="cal-grid book-cal">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="cal-dow" aria-hidden="true">
                {d}
              </div>
            ))}
            {monthMatrix(ym.y, ym.m)
              .flat()
              .map((d, i) => {
                if (!d) return <div key={`e${i}`} className="cal-cell empty" />;
                const n = byDate[d]?.length || 0;
                return (
                  <button
                    key={d}
                    className={`cal-cell ${n ? 'available' : ''} ${date === d ? 'selected' : ''} ${d === today ? 'today' : ''}`}
                    disabled={!n}
                    onClick={() => {
                      setDate(d);
                      setSlotId(null);
                      setError('');
                    }}
                    aria-label={`${fmtDate(d)}${n ? `, ${n} time${n > 1 ? 's' : ''} available` : ', unavailable'}`}
                    aria-pressed={date === d}
                  >
                    <span className="cal-num">{Number(d.slice(8))}</span>
                    {n > 0 && <span className="avail-dot" aria-hidden="true" />}
                  </button>
                );
              })}
          </div>
          <p className="small muted">
            <span className="avail-dot inline" aria-hidden="true" /> Dates with available times
          </p>
        </Card>

        <Card>
          {!date ? (
            <EmptyState emoji="🗓️" title="Pick a date" message="Available dates are marked on the calendar." />
          ) : (
            <>
              <h2 className="h3">{fmtLong(date)}</h2>
              <p className="muted small">Available times</p>
              <div className="time-grid" role="radiogroup" aria-label="Available times">
                {daySlots.map((s) => {
                  const c = byId(db, s.counselor_id);
                  return (
                    <button
                      key={s.id}
                      role="radio"
                      aria-checked={slotId === s.id}
                      className={`time-card ${slotId === s.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSlotId(s.id);
                        setError('');
                      }}
                    >
                      <strong>{fmtTime(s.time)}</strong>
                      <span>
                        {c.first_name} {c.last_name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!resched && (
                <TextField as="textarea" rows={2} label="What would you like to talk about? (optional)" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} hint="Only you and the guidance office can see this." />
              )}
              {error && <Alert tone="error">{error}</Alert>}
              <Button size="lg" className="btn-block" onClick={submit} loading={loading} disabled={!slotId}>
                {resched ? 'Request New Time' : 'Request Appointment'}
              </Button>
            </>
          )}
        </Card>
      </div>
      {Object.keys(byDate).length === 0 && (
        <Alert tone="info">
          No open times right now. Please check back soon or visit the guidance office. <LinkButton to="/s/appointments" variant="ghost" size="sm">Back</LinkButton>
        </Alert>
      )}
    </>
  );
}
