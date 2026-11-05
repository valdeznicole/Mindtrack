import { useEffect, useState } from 'react';
import { useDB } from '../../lib/store';
import { byId, fullName, isSuperadmin, moodsOf, moodSeries, wellnessOf, apptSort } from '../../lib/selectors';
import { fmtDate, fmtDateTime, timeAgo } from '../../lib/dates';
import { MOOD } from '../../lib/moods';
import { statusFor, SURVEY_OPTIONS } from '../../lib/scoring';
import { archiveStudent, logAccess, restoreStudent, reviewFlag, setOfficer } from '../../lib/actions';
import { OFFICER_POSITIONS } from '../../config';
import { DeleteStudentModal, StudentFormModal } from './StudentAdmin';
import { navigate } from '../../lib/router';
import { Alert, Avatar, Button, Card, EmptyState, LinkButton, Modal, PageHeader, SectionTitle, Segmented, SelectField, StatusPill, Tabs, useFeedback, MoodIcon, Emoji, emojify } from '../../components/ui';
import { AppointmentCard, MoodCalendar, MoodDetail, MoodTimeline, WellnessScoreCard } from '../../components/common';
import { AreaChart, MOOD_TICKS, moodValueLabel } from '../../components/charts';

export default function StudentProfile({ user, params, query }) {
  const db = useDB();
  const s = byId(db, params.id);
  const tab = query.tab || 'overview';
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [officerOpen, setOfficerOpen] = useState(false);
  const isSuper = isSuperadmin(db);

  // Every access to an individual student's wellness profile is recorded.
  useEffect(() => {
    if (s && s.role === 'student') logAccess('student_profile_viewed', `${s.student_id}`);
  }, [s?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s || s.role !== 'student') return <EmptyState emoji="🔍" title="Student not found" action={<LinkButton to="/c/students">Back to students</LinkButton>} />;

  const flags = db.flags.filter((f) => f.user_id === s.id);
  const openFlags = flags.filter((f) => f.status !== 'reviewed').length;
  const journals = db.journals.filter((j) => j.user_id === s.id && j.is_shared);
  const appts = db.appointments.filter((a) => a.student_id === s.id).sort(apptSort).reverse();
  const surveys = db.surveyResponses.filter((r) => r.user_id === s.id).sort((a, b) => b.submitted_at - a.submitted_at);
  const setTab = (t) => navigate(`/c/students/${s.id}${t === 'overview' ? '' : `?tab=${t}`}`, { replace: true });

  return (
    <>
      <PageHeader
        back="/c/students"
        title="Student Wellness Profile"
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {s.archived ? (
              <Button
                variant="secondary"
                onClick={async () => {
                  await restoreStudent(s.id);
                  toast(`${fullName(s)} is active again and can sign in.`);
                }}
              >
                Restore
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Archive this student?',
                    message: `${fullName(s)} won’t be able to sign in and will be hidden from lists and statistics. Upcoming appointments are cancelled. Their history is kept, and you can restore the account anytime.`,
                    confirmLabel: 'Archive',
                  });
                  if (!ok) return;
                  await archiveStudent(s.id);
                  toast('Student archived.');
                }}
              >
                Archive
              </Button>
            )}
            {isSuper && (
              <Button variant="danger-soft" onClick={() => setDeleting(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />
      {s.archived && (
        <Alert tone="warn" title="This account is archived.">
          The student can’t sign in and is hidden from lists and statistics. Their history is kept below. Use Restore to reactivate it.
        </Alert>
      )}
      <Card className="profile-card">
        <Avatar user={s} size={72} />
        <div>
          <h2>{fullName(s)}</h2>
          {s.officer_position && (
            <p>
              <span className="pill pill-lavender officer-pill"><Emoji e="🎓" /> Officer · {s.officer_position}</span>
            </p>
          )}
          <p className="muted">
            #{s.student_id} · {s.grade_level} · {s.section}
          </p>
          <p className="muted small">{s.email}</p>
        </div>
        <div className="btn-row">
          {openFlags > 0 && <span className="pill pill-pink"><Emoji e="🚩" /> {openFlags} open review{openFlags > 1 ? 's' : ''}</span>}
          {isSuper && !s.archived && (
            <Button variant="secondary" size="sm" onClick={() => setOfficerOpen(true)}>
              {s.officer_position ? 'Change officer position' : 'Make officer'}
            </Button>
          )}
        </div>
      </Card>
      <p className="tiny muted privacy-line"><Emoji e="🔒" /> Confidential. Access to this profile is logged. Journal entries appear only when the student shares them.</p>

      <Tabs
        label="Profile sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'mood', label: 'Mood' },
          { value: 'surveys', label: 'Surveys', count: surveys.length },
          { value: 'flags', label: 'Review Flags', count: flags.length },
          { value: 'journals', label: 'Shared Journals', count: journals.length },
          { value: 'appointments', label: 'Appointments', count: appts.length },
        ]}
      />
      <div className="tab-panel" role="tabpanel">
        {tab === 'overview' && <Overview db={db} s={s} />}
        {editing && <StudentFormModal student={s} onClose={() => setEditing(false)} />}
        {deleting && <DeleteStudentModal student={s} onClose={() => setDeleting(false)} />}
        {officerOpen && <OfficerModal student={s} onClose={() => setOfficerOpen(false)} />}
        {tab === 'mood' && <MoodTab db={db} s={s} />}
        {tab === 'surveys' && <Surveys db={db} surveys={surveys} />}
        {tab === 'flags' && <Flags flags={flags} user={user} db={db} />}
        {tab === 'journals' && <Journals journals={journals} user={user} />}
        {tab === 'appointments' &&
          (appts.length ? (
            <div className="appt-list">
              {appts.map((a) => (
                <AppointmentCard key={a.id} appt={a} counselor={byId(db, a.counselor_id)} />
              ))}
            </div>
          ) : (
            <EmptyState emoji="📅" title="No appointments yet" />
          ))}
      </div>
    </>
  );
}

function Overview({ db, s }) {
  const { current, previous } = wellnessOf(db, s.id);
  const recent = moodsOf(db, s.id).slice(0, 5);
  const shareNotes = s.settings?.privacy?.share_mood_notes;
  return (
    <>
      <div className="grid-2">
        <WellnessScoreCard current={current} previous={previous} title="Wellness Indicator" />
        <Card>
          <SectionTitle>Mood trend · 30 days</SectionTitle>
          <AreaChart data={moodSeries(db, s.id, 30)} yTicks={MOOD_TICKS} height={200} ariaLabel="Student mood trend, 30 days" formatValue={moodValueLabel} />
        </Card>
      </div>
      <Card>
        <SectionTitle>Recent check-ins</SectionTitle>
        {recent.length ? <MoodTimeline entries={recent} showNotes={shareNotes} /> : <p className="muted">No check-ins yet.</p>}
        {!shareNotes && <p className="tiny muted">The student hasn’t chosen to share mood notes, so only mood levels are shown.</p>}
      </Card>
    </>
  );
}

function MoodTab({ db, s }) {
  const [range, setRange] = useState(30);
  const [sel, setSel] = useState(null);
  const shareNotes = s.settings?.privacy?.share_mood_notes;
  return (
    <>
      <Card>
        <SectionTitle
          action={
            <Segmented
              label="Range"
              value={range}
              onChange={setRange}
              options={[
                { value: 7, label: '7 Days' },
                { value: 30, label: '30 Days' },
                { value: 90, label: '3 Months' },
              ]}
            />
          }
        >
          Mood trends
        </SectionTitle>
        <AreaChart data={moodSeries(db, s.id, range)} yTicks={MOOD_TICKS} height={240} ariaLabel={`Student mood trend, ${range} days`} formatValue={moodValueLabel} />
      </Card>
      <div className="grid-cal">
        <Card>
          <MoodCalendar moods={moodsOf(db, s.id)} selected={sel?.date} onSelect={(date, entry) => setSel({ date, entry })} />
        </Card>
        <Card>
          {sel ? <MoodDetail entry={sel.entry} showNote={shareNotes} /> : <EmptyState emoji="🗓️" title="Select a day" />}
          {!shareNotes && <p className="tiny muted">Mood notes and factors are private to the student.</p>}
        </Card>
      </div>
    </>
  );
}

function Surveys({ db, surveys }) {
  const [open, setOpen] = useState(null);
  if (!surveys.length) return <EmptyState emoji="📋" title="No wellness checks yet" />;
  const qs = db.surveyQuestions.filter((q) => q.survey_id === open?.survey_id).sort((a, b) => a.order - b.order);
  return (
    <>
      <Card>
        <SectionTitle>Wellness check scores</SectionTitle>
        {surveys.length > 1 && (
          <AreaChart
            data={[...surveys].reverse().map((r) => ({ label: fmtDate(r.date, { month: 'short', day: 'numeric' }), value: r.score }))}
            min={0}
            max={100}
            height={180}
            color="#8C7BB0"
            yTicks={[
              { value: 100, label: '100' },
              { value: 50, label: '50' },
              { value: 0, label: '0' },
            ]}
            ariaLabel="Wellness check scores over time"
          />
        )}
        <ul className="list-rows">
          {surveys.map((r) => (
            <li key={r.id}>
              <button className="list-row" onClick={() => setOpen(r)}>
                <span className="score-chip">{r.score}</span>
                <span>
                  <strong>{statusFor(r.score).label}</strong>
                  <span className="muted small">
                    {fmtDate(r.date)}
                    {r.flagged && emojify(' · 🚩 met review criteria')}
                  </span>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Modal open={!!open} onClose={() => setOpen(null)} title={`Wellness Check · ${open ? fmtDate(open.date) : ''}`} size="modal-lg">
        {open && (
          <>
            <p>
              Score <strong>{open.score}/100</strong> · {statusFor(open.score).label}
            </p>
            {open.areas?.length > 0 && <p className="muted small">Areas for reflection: {open.areas.join(', ')}</p>}
            <ol className="answer-review">
              {qs.map((q, i) => (
                <li key={q.id} className={q.critical && open.answers[i] >= 3 ? 'critical' : ''}>
                  <span>{q.question}</span>
                  <strong>{SURVEY_OPTIONS[open.answers[i]]}</strong>
                </li>
              ))}
            </ol>
            <p className="tiny muted">Self-reported responses. Use professional judgment; this is not a diagnostic instrument.</p>
          </>
        )}
      </Modal>
    </>
  );
}

function Flags({ flags, user, db }) {
  const { confirm, toast } = useFeedback();
  if (!flags.length) return <EmptyState emoji="🌿" title="No review flags" />;
  const act = async (f, status) => {
    const ok = await confirm(
      status === 'reviewed'
        ? { title: 'Mark as reviewed?', message: 'This flag will move to the reviewed list.', confirmLabel: 'Mark as Reviewed' }
        : { title: 'Follow up with this student?', message: 'The student will receive a friendly invitation to book a session.', confirmLabel: 'Send invitation' },
    );
    if (!ok) return;
    await reviewFlag(f.id, user.id, status);
    toast(status === 'reviewed' ? 'Marked as reviewed.' : 'Follow-up invitation sent.');
  };
  return (
    <div className="flag-list">
      {[...flags]
        .sort((a, b) => b.created_at - a.created_at)
        .map((f) => (
          <Card key={f.id} className="flag-card">
            <div className="flag-top">
              <strong>{f.source}</strong>
              <StatusPill status={f.status} />
            </div>
            <p>May warrant counselor review.</p>
            <p className="muted small">{f.reason}</p>
            <p className="tiny muted">
              Flagged {timeAgo(f.created_at)}
              {f.reviewed_at && ` · Updated ${fmtDateTime(f.reviewed_at)} by ${fullName(byId(db, f.reviewed_by))}`}
            </p>
            {f.status !== 'reviewed' && (
              <div className="btn-row">
                <Button size="sm" onClick={() => act(f, 'reviewed')}>
                  Mark as Reviewed
                </Button>
                {f.status !== 'follow_up' && (
                  <Button size="sm" variant="secondary" onClick={() => act(f, 'follow_up')}>
                    Follow Up
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}
    </div>
  );
}

function Journals({ journals, user }) {
  const [open, setOpen] = useState(null);
  if (!journals.length) return <EmptyState emoji="📝" title="No shared entries" message="This student hasn’t shared any journal entries." />;
  const view = (j) => {
    logAccess('shared_journal_viewed', j.id);
    setOpen(j);
  };
  return (
    <>
      <div className="journal-grid">
        {journals.map((j) => (
          <button key={j.id} className="journal-card" style={{ '--tint': MOOD[j.mood]?.soft || '#F1F4F2', '--edge': MOOD[j.mood]?.color || '#DDE3DF' }} onClick={() => view(j)}>
            <div className="journal-top">
              <span className="journal-mood" aria-hidden="true">
                {MOOD[j.mood] ? <MoodIcon mood={j.mood} size={32} /> : <Emoji e="📝" />}
              </span>
              <span className="muted small">{fmtDate(j.date)}</span>
            </div>
            <h2>{j.title}</h2>
            <p className="journal-preview">{j.content}</p>
          </button>
        ))}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title} size="modal-lg">
        {open && (
          <>
            <p className="muted small">
              {fmtDate(open.date)} {open.mood && `· ${MOOD[open.mood].label}`}
            </p>
            <div className="journal-body">{open.content}</div>
          </>
        )}
      </Modal>
    </>
  );
}

// Superadmin: name a student an officer (or take the position away). Officers use MindTrack like any student;
// the position is a label on their profile.
function OfficerModal({ student, onClose }) {
  const { toast } = useFeedback();
  const [position, setPosition] = useState(student.officer_position || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setOfficer(student.id, position);
      toast(position ? `${fullName(student)} is now ${position}.` : 'Officer position removed.');
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Officer position"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <SelectField label={`Position for ${fullName(student)}`} value={position} onChange={(e) => setPosition(e.target.value)} options={OFFICER_POSITIONS} placeholder="Not an officer" />
        <p className="muted small">The position shows on the student’s profile and in the student list. It doesn’t give access to anyone else’s information.</p>
      </div>
    </Modal>
  );
}
