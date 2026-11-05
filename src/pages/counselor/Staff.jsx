import { useState } from 'react';
import { useDB } from '../../lib/store';
import { fullName, isActiveAppt, isSuperadmin, staffOf } from '../../lib/selectors';
import { archiveStaff, createStaff, restoreStaff, updateStaff } from '../../lib/actions';
import { todayISO } from '../../lib/dates';
import { SCHOOL } from '../../config';
import { Alert, Avatar, Button, Card, EmptyState, LinkButton, Modal, PageHeader, TextField, useFeedback } from '../../components/ui';

// Superadmin only: the guidance staff accounts. Admins consult students and do everything a superadmin does
// except managing staff, editing questionnaires, naming officers and permanently deleting students.

const blank = { first_name: '', last_name: '', email: '', title: 'Guidance Counselor', password: '' };

function StaffFormModal({ staff, onClose }) {
  const { toast } = useFeedback();
  const isNew = !staff;
  const [f, setF] = useState(() => (staff ? { ...blank, ...staff, password: '' } : blank));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value });

  const save = async () => {
    const e = {};
    if (!f.first_name.trim()) e.first_name = 'Please enter the first name.';
    if (!f.last_name.trim()) e.last_name = 'Please enter the last name.';
    if (!f.email.trim()) e.email = 'Please enter the school email.';
    if (isNew && !f.password) e.password = 'Please set a starting password.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const data = { first_name: f.first_name, last_name: f.last_name, email: f.email.trim().toLowerCase(), title: f.title, password: f.password };
      if (isNew) {
        await createStaff(data);
        toast('Admin added. They can log in now.');
      } else {
        await updateStaff({ id: staff.id, ...data });
        toast('Staff details saved.');
      }
      onClose();
    } catch (err) {
      setErrors({ [err.data?.field || 'form']: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Add admin' : `Edit ${fullName(staff)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {isNew ? 'Add admin' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
        <div className="grid-2 tight">
          <TextField label="First name" value={f.first_name} onChange={set('first_name')} error={errors.first_name} />
          <TextField label="Last name" value={f.last_name} onChange={set('last_name')} error={errors.last_name} />
        </div>
        <TextField label="School email" type="email" value={f.email} onChange={set('email')} error={errors.email} placeholder={`lastnamefirstname@${SCHOOL.emailDomain}`} />
        <TextField label="Title" value={f.title} onChange={set('title')} error={errors.title} placeholder="e.g. Guidance Counselor" hint="Students see this next to the name when they book a session." />
        <TextField
          label={isNew ? 'Starting password' : 'New password (optional)'}
          type="password"
          value={f.password}
          onChange={set('password')}
          error={errors.password}
          autoComplete="new-password"
          hint={isNew ? 'At least 8 characters with a letter and a number. Give it to the admin; they can change it in Settings.' : 'Leave empty to keep the current password.'}
        />
      </div>
    </Modal>
  );
}

export default function Staff({ user }) {
  const db = useDB();
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState(null); // staff object, or {} for a new admin

  if (!isSuperadmin(db)) {
    return <EmptyState emoji="🔒" title="Superadmin only" message="Only the superadmin can manage staff accounts." action={<LinkButton to="/c/dashboard">Back to dashboard</LinkButton>} />;
  }

  const today = todayISO();
  const staff = staffOf(db).sort((a, b) => Number(b.is_super) - Number(a.is_super) || Number(a.archived) - Number(b.archived) || a.last_name.localeCompare(b.last_name));
  const upcoming = (id) => db.appointments.filter((a) => a.counselor_id === id && isActiveAppt(a) && a.date >= today).length;

  const remove = async (s) => {
    const n = upcoming(s.id);
    const ok = await confirm({
      title: `Remove ${fullName(s)}?`,
      message: `They won’t be able to sign in, and students can no longer book them.${n ? ` Their ${n} upcoming session${n > 1 ? 's' : ''} will be canceled and the students told to book again.` : ''} Past sessions stay in the records, and you can restore the account anytime.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    await archiveStaff(s.id);
    toast('Admin removed.');
  };

  return (
    <>
      <PageHeader title="Staff" subtitle="Admins consult students and help run the guidance office in MindTrack." actions={<Button onClick={() => setEditing({})}>+ Add admin</Button>} />
      <Alert tone="info" title="What admins can do">
        Everything you can, including opening appointment times and consulting students, except these superadmin tasks: managing staff, editing Wellness Check questionnaires, naming officers and permanently deleting students.
      </Alert>
      <ul className="staff-list">
        {staff.map((s) => (
          <li key={s.id}>
            <Card className={`staff-card ${s.archived ? 'is-archived' : ''}`}>
              <Avatar user={s} size={52} />
              <div className="grow">
                <div className="staff-name">
                  <strong>{fullName(s)}</strong>
                  {s.is_super ? <span className="pill pill-green">Superadmin</span> : s.archived ? <span className="pill pill-gray">Removed</span> : <span className="pill pill-blue">Admin</span>}
                  {s.id === user.id && <span className="pill">You</span>}
                </div>
                <p className="muted small">{s.title || 'Guidance Counselor'}</p>
                <p className="muted small staff-email">{s.email}</p>
                {!s.archived && <p className="tiny muted">{upcoming(s.id)} upcoming session{upcoming(s.id) === 1 ? '' : 's'}</p>}
              </div>
              <div className="btn-row">
                {s.archived ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await restoreStaff(s.id);
                      toast(`${fullName(s)} can sign in again.`);
                    }}
                  >
                    Restore
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setEditing(s)}>
                      Edit
                    </Button>
                    {!s.is_super && (
                      <Button variant="danger-soft" size="sm" onClick={() => remove(s)}>
                        Remove
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {editing && <StaffFormModal key={editing.id || 'new'} staff={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </>
  );
}
