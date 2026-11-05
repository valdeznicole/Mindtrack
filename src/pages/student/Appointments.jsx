import { useState } from 'react';
import { useDB } from '../../lib/store';
import { todayISO, fmtLong, fmtTime, fmtDateTime } from '../../lib/dates';
import { byId, apptSort, isActiveAppt } from '../../lib/selectors';
import { addReminder, cancelAppointment } from '../../lib/actions';
import { navigate } from '../../lib/router';
import { Button, EmptyState, LinkButton, Modal, PageHeader, StatusPill, Tabs, useFeedback, Emoji } from '../../components/ui';
import { AppointmentCard } from '../../components/common';

export default function Appointments({ user, query }) {
  const db = useDB();
  const { toast, confirm } = useFeedback();
  const [tab, setTab] = useState('upcoming');
  const [detail, setDetail] = useState(query.id || null);
  const today = todayISO();
  const mine = db.appointments.filter((a) => a.student_id === user.id);
  const groups = {
    upcoming: mine.filter((a) => isActiveAppt(a) && a.date >= today).sort(apptSort),
    completed: mine.filter((a) => a.status === 'completed').sort(apptSort).reverse(),
    canceled: mine.filter((a) => a.status === 'canceled').sort(apptSort).reverse(),
  };
  const list = groups[tab];
  const open = mine.find((a) => a.id === detail);

  const cancel = async (a) => {
    const ok = await confirm({ title: 'Cancel this appointment?', message: `${fmtLong(a.date)} at ${fmtTime(a.time)}. The time slot will be released for other students.`, confirmLabel: 'Cancel appointment', cancelLabel: 'Keep it', tone: 'danger' });
    if (!ok) return;
    await cancelAppointment(a.id);
    setDetail(null);
    toast('Your appointment has been canceled.');
  };

  const remind = async (a) => {
    await addReminder(a.id);
    toast('Reminder added 🔔');
  };

  return (
    <>
      <PageHeader title="Appointments" subtitle="Talk to a guidance counselor — online booking, no walk-in needed." actions={<LinkButton to="/s/appointments/book">+ Book a Session</LinkButton>} />
      <Tabs
        label="Appointment status"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
          { value: 'completed', label: 'Completed', count: groups.completed.length },
          { value: 'canceled', label: 'Canceled', count: groups.canceled.length },
        ]}
      />
      <div className="tab-panel" role="tabpanel">
        {list.length === 0 ? (
          <EmptyState
            emoji="📅"
            title={tab === 'upcoming' ? 'No upcoming appointments' : `No ${tab} appointments`}
            message={tab === 'upcoming' ? 'Whenever you’d like to talk, a counselor is here to listen.' : undefined}
            action={tab === 'upcoming' && <LinkButton to="/s/appointments/book">Book a Counseling Session</LinkButton>}
          />
        ) : (
          <div className="appt-list">
            {list.map((a) => (
              <AppointmentCard
                key={a.id}
                appt={a}
                counselor={byId(db, a.counselor_id)}
                actions={
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setDetail(a.id)}>
                      View Details
                    </Button>
                    {tab === 'upcoming' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/s/appointments/book?resched=${a.id}`)}>
                          Reschedule
                        </Button>
                        <Button variant="danger-soft" size="sm" onClick={() => cancel(a)}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!open}
        onClose={() => setDetail(null)}
        title="Appointment Details"
        footer={
          open &&
          isActiveAppt(open) &&
          open.date >= today && (
            <>
              {!open.reminder && (
                <Button variant="secondary" onClick={() => remind(open)}>
                  <Emoji e="🔔" /> Add Reminder
                </Button>
              )}
              <Button variant="danger-soft" onClick={() => cancel(open)}>
                Cancel appointment
              </Button>
            </>
          )
        }
      >
        {open && (
          <dl className="detail-list">
            <div>
              <dt>Session</dt>
              <dd>Guidance Counseling</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{fmtLong(open.date)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{fmtTime(open.time)}</dd>
            </div>
            <div>
              <dt>Counselor</dt>
              <dd>
                {byId(db, open.counselor_id)?.first_name} {byId(db, open.counselor_id)?.last_name}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusPill status={open.status} />
              </dd>
            </div>
            {open.reason && (
              <div>
                <dt>Topic</dt>
                <dd>{open.reason}</dd>
              </div>
            )}
            <div>
              <dt>Location</dt>
              <dd>SMCBI Guidance Office</dd>
            </div>
            <div>
              <dt>Requested</dt>
              <dd>{fmtDateTime(open.created_at)}</dd>
            </div>
            {open.reminder && (
              <div>
                <dt>Reminder</dt>
                <dd><Emoji e="🔔" /> On</dd>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </>
  );
}
