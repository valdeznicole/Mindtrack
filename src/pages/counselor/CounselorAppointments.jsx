import { useState } from 'react';
import { useDB } from '../../lib/store';
import { todayISO, addDays, fmtLong, fmtTime, fmtDate, monthMatrix, monthLabel, startOfWeek, weekdayShort, parseISO, isWeekend, toISO } from '../../lib/dates';
import { byId, fullName, apptSort } from '../../lib/selectors';
import { addAvailability, blockDate, setAppointmentStatus, setSlotStatus } from '../../lib/actions';
import { Alert, Button, Card, EmptyState, Modal, PageHeader, SectionTitle, Segmented, StatusPill, TextField, useFeedback, Emoji, emojify } from '../../components/ui';
import { AppointmentCard } from '../../components/common';

const TIME_OPTIONS = ['08:00', '09:00', '09:30', '10:30', '11:00', '13:00', '14:00', '14:30', '15:30', '16:00'];

export default function CounselorAppointments({ user }) {
  const db = useDB();
  const { toast, confirm } = useFeedback();
  const today = todayISO();
  const [view, setView] = useState('week');
  const [cursor, setCursor] = useState(today);
  const [manage, setManage] = useState(null);
  const [availOpen, setAvailOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const mySlots = db.slots.filter((s) => s.counselor_id === user.id);
  const myAppts = db.appointments.filter((a) => a.counselor_id === user.id);
  const pending = myAppts.filter((a) => a.status === 'pending' && a.date >= today).sort(apptSort);

  const shift = (dir) => {
    if (view === 'day') setCursor(addDays(cursor, dir));
    if (view === 'week') setCursor(addDays(cursor, dir * 7));
    if (view === 'month') {
      const d = parseISO(cursor);
      setCursor(toISO(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
    }
  };

  const title =
    view === 'day'
      ? fmtLong(cursor)
      : view === 'week'
        ? `${fmtDate(startOfWeek(cursor), { month: 'short', day: 'numeric' })} – ${fmtDate(addDays(startOfWeek(cursor), 6), { month: 'short', day: 'numeric', year: 'numeric' })}`
        : monthLabel(parseISO(cursor).getFullYear(), parseISO(cursor).getMonth());

  const decide = async (a, status) => {
    const s = byId(db, a.student_id);
    if (status === 'canceled') {
      const ok = await confirm({ title: 'Decline this request?', message: `${fullName(s)} will be notified and the time will reopen.`, confirmLabel: 'Decline', tone: 'danger' });
      if (!ok) return;
    }
    await setAppointmentStatus(a.id, status);
    toast(status === 'confirmed' ? 'Appointment confirmed. The student has been notified.' : 'Request declined.');
  };

  const slotsOn = (date) => mySlots.filter((s) => s.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const apptFor = (slot) => myAppts.find((a) => a.id === slot.appointment_id);

  const onSlot = async (slot) => {
    const a = apptFor(slot);
    if (a) return setManage(a);
    if (slot.date < today) return;
    const blocking = slot.status === 'open';
    const ok = await confirm({
      title: blocking ? 'Block this time?' : 'Reopen this time?',
      message: `${fmtLong(slot.date)} at ${fmtTime(slot.time)}`,
      confirmLabel: blocking ? 'Block' : 'Reopen',
    });
    if (!ok) return;
    await setSlotStatus(slot.id, blocking ? 'blocked' : 'open');
    toast(blocking ? 'Time blocked.' : 'Time reopened.');
  };

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Manage requests, sessions and your availability."
        actions={
          <>
            <Button variant="secondary" onClick={() => setBlockOpen(true)}>
              <Emoji e="⛔" /> Block Schedule
            </Button>
            <Button onClick={() => setAvailOpen(true)}>+ Add Availability</Button>
          </>
        }
      />

      <Card>
        <SectionTitle>Pending Requests ({pending.length})</SectionTitle>
        {pending.length ? (
          <div className="appt-list">
            {pending.map((a) => (
              <AppointmentCard
                key={a.id}
                appt={a}
                student={byId(db, a.student_id)}
                actions={
                  <>
                    <Button size="sm" onClick={() => decide(a, 'confirmed')}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => decide(a, 'canceled')}>
                      Decline
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <p className="muted">No pending requests. <Emoji e="🎉" /></p>
        )}
      </Card>

      <Card>
        <div className="cal-toolbar">
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous">
              ‹
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(today)}>
              Today
            </button>
            <button className="icon-btn" onClick={() => shift(1)} aria-label="Next">
              ›
            </button>
            <h2 className="h3" aria-live="polite">
              {title}
            </h2>
          </div>
          <Segmented
            label="Calendar view"
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
        </div>
        <ul className="legend">
          <li>
            <span className="slot-key open" /> Available
          </li>
          <li>
            <span className="slot-key pending" /> Pending
          </li>
          <li>
            <span className="slot-key confirmed" /> Confirmed
          </li>
          <li>
            <span className="slot-key completed" /> Completed
          </li>
          <li>
            <span className="slot-key blocked" /> Blocked
          </li>
        </ul>

        {view === 'day' && <DayView date={cursor} slots={slotsOn(cursor)} apptFor={apptFor} db={db} onSlot={onSlot} />}
        {view === 'week' && (
          <div className="week-grid">
            {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i)).map((d) => (
              <div key={d} className={`week-col ${d === today ? 'today' : ''} ${isWeekend(d) ? 'weekend' : ''}`}>
                <button className="week-head" onClick={() => {
                  setCursor(d);
                  setView('day');
                }}>
                  <span>{weekdayShort(d)}</span>
                  <strong>{Number(d.slice(8))}</strong>
                </button>
                {slotsOn(d).map((s) => (
                  <SlotChip key={s.id} slot={s} appt={apptFor(s)} db={db} onClick={() => onSlot(s)} compact />
                ))}
              </div>
            ))}
          </div>
        )}
        {view === 'month' && (
          <div className="cal-grid month-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="cal-dow">
                {d}
              </div>
            ))}
            {monthMatrix(parseISO(cursor).getFullYear(), parseISO(cursor).getMonth())
              .flat()
              .map((d, i) => {
                if (!d) return <div key={`e${i}`} className="cal-cell empty" />;
                const ss = slotsOn(d);
                const booked = ss.filter((s) => s.status === 'booked').length;
                const open = ss.filter((s) => s.status === 'open').length;
                return (
                  <button
                    key={d}
                    className={`cal-cell month-cell ${d === today ? 'today' : ''}`}
                    onClick={() => {
                      setCursor(d);
                      setView('day');
                    }}
                    aria-label={`${fmtDate(d)}: ${booked} booked, ${open} available`}
                  >
                    <span className="cal-num">{Number(d.slice(8))}</span>
                    {booked > 0 && <span className="mini-count booked">{booked} booked</span>}
                    {open > 0 && <span className="mini-count open">{open} open</span>}
                  </button>
                );
              })}
          </div>
        )}
      </Card>

      <ManageModal appt={manage} db={db} onClose={() => setManage(null)} />
      <AvailabilityModal open={availOpen} onClose={() => setAvailOpen(false)} user={user} />
      <BlockModal open={blockOpen} onClose={() => setBlockOpen(false)} user={user} />
    </>
  );
}

function SlotChip({ slot, appt, db, onClick, compact }) {
  const status = appt ? appt.status : slot.status;
  const s = appt && byId(db, appt.student_id);
  return (
    <button className={`slot-chip ${status}`} onClick={onClick}>
      <strong>{fmtTime(slot.time)}</strong>
      <span>{s ? (compact ? s.last_name : fullName(s)) : status === 'blocked' ? 'Blocked' : 'Available'}</span>
    </button>
  );
}

function DayView({ date, slots, apptFor, db, onSlot }) {
  if (!slots.length) return <EmptyState emoji="🗓️" title="No availability on this day" message="Use “Add Availability” to open times." />;
  return (
    <ul className="day-list">
      {slots.map((s) => {
        const a = apptFor(s);
        const st = a && byId(db, a.student_id);
        return (
          <li key={s.id}>
            <span className="day-time">{fmtTime(s.time)}</span>
            <button className={`day-slot ${a ? a.status : s.status}`} onClick={() => onSlot(s)}>
              {a ? (
                <>
                  <strong>{fullName(st)}</strong>
                  <span className="muted small">
                    #{st.student_id} · {a.reason || 'Guidance counseling'}
                  </span>
                  <StatusPill status={a.status} />
                </>
              ) : (
                <span>{emojify(s.status === 'blocked' ? '⛔ Blocked' : '✓ Available')}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ManageModal({ appt, db, onClose }) {
  const { toast, confirm } = useFeedback();
  const [notes, setNotes] = useState('');
  const [lastId, setLastId] = useState(null);
  if (appt && appt.id !== lastId) {
    setLastId(appt.id);
    setNotes(appt.notes || '');
  }
  if (!appt) return null;
  const a = db.appointments.find((x) => x.id === appt.id);
  const s = byId(db, a.student_id);
  const update = async (status) => {
    if (status === 'canceled' && !(await confirm({ title: 'Cancel this session?', message: 'The student will be notified and the time will reopen.', confirmLabel: 'Cancel session', tone: 'danger' }))) return;
    await setAppointmentStatus(a.id, status, notes);
    toast('Appointment updated.');
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Manage Appointment"
      footer={
        <>
          {a.status === 'pending' && <Button onClick={() => update('confirmed')}>Confirm</Button>}
          {(a.status === 'confirmed' || a.status === 'pending') && (
            <Button variant="secondary" onClick={() => update('completed')}>
              Mark Completed
            </Button>
          )}
          {(a.status === 'confirmed' || a.status === 'pending') && (
            <Button variant="danger-soft" onClick={() => update('canceled')}>
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              await setAppointmentStatus(a.id, a.status, notes);
              toast('Notes saved.');
              onClose();
            }}
          >
            Save notes
          </Button>
        </>
      }
    >
      <dl className="detail-list">
        <div>
          <dt>Student</dt>
          <dd>
            <a href={`#/c/students/${s.id}`}>{fullName(s)}</a> · #{s.student_id}
          </dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>
            {fmtLong(a.date)} · {fmtTime(a.time)}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusPill status={a.status} />
          </dd>
        </div>
        {a.reason && (
          <div>
            <dt>Topic</dt>
            <dd>{a.reason}</dd>
          </div>
        )}
      </dl>
      <TextField as="textarea" rows={3} label="Session notes (counselor only)" value={notes} onChange={(e) => setNotes(e.target.value)} />
    </Modal>
  );
}

function AvailabilityModal({ open, onClose, user }) {
  const { toast } = useFeedback();
  const [start, setStart] = useState(addDays(todayISO(), 1));
  const [days, setDays] = useState(5);
  const [times, setTimes] = useState(['09:00', '10:30', '13:00', '14:30']);
  const [skipWeekends, setSkip] = useState(true);
  const [error, setError] = useState('');
  const save = async () => {
    if (!times.length) return setError('Choose at least one time.');
    if (start < todayISO()) return setError('Start date can’t be in the past.');
    const dates = Array.from({ length: days }, (_, i) => addDays(start, i)).filter((d) => !skipWeekends || !isWeekend(d));
    const n = await addAvailability(user.id, dates, times);
    toast(n ? `${n} new time slot${n > 1 ? 's' : ''} added.` : 'Those times were already available.', n ? 'success' : 'info');
    setError('');
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Availability"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Add slots</Button>
        </>
      }
    >
      <div className="grid-2 tight">
        <TextField label="Starting" type="date" min={todayISO()} value={start} onChange={(e) => setStart(e.target.value)} />
        <TextField label="Number of days" type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
      </div>
      <fieldset className="factor-set">
        <legend>Times</legend>
        <div className="chip-row">
          {TIME_OPTIONS.map((t) => (
            <button key={t} type="button" className={`chip ${times.includes(t) ? 'on' : ''}`} aria-pressed={times.includes(t)} onClick={() => setTimes(times.includes(t) ? times.filter((x) => x !== t) : [...times, t].sort())}>
              {fmtTime(t)}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="check-label">
        <input type="checkbox" checked={skipWeekends} onChange={(e) => setSkip(e.target.checked)} /> Skip weekends
      </label>
      {error && <Alert tone="error">{error}</Alert>}
    </Modal>
  );
}

function BlockModal({ open, onClose, user }) {
  const { toast } = useFeedback();
  const [date, setDate] = useState(todayISO());
  const save = async () => {
    const n = await blockDate(user.id, date);
    toast(n ? `${n} open time${n > 1 ? 's' : ''} blocked on ${fmtDate(date, { month: 'long', day: 'numeric' })}.` : 'No open times to block on that day.', n ? 'success' : 'info');
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Block Schedule"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Block day</Button>
        </>
      }
    >
      <p className="muted">Blocks all open times on the chosen day. Booked sessions are not affected — manage them individually.</p>
      <TextField label="Date" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
    </Modal>
  );
}
