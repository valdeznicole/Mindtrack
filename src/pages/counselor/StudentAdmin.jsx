import { useState } from 'react';
import { createStudent, deleteStudent, updateStudent } from '../../lib/actions';
import { expectedEmail } from '../../lib/auth';
import { navigate } from '../../lib/router';
import { SCHOOL, STUDENT_ID, YEAR_LEVELS, normalizeStudentId } from '../../config';
import { Alert, Button, Modal, SelectField, TextField, useFeedback } from '../../components/ui';

// Counselor tools for student accounts: add / edit form and the permanent-delete confirmation.
// Archive and restore are simple confirms on the profile page (see StudentProfile.jsx).

const blank = { first_name: '', last_name: '', email: '', student_id: '', grade_level: '', section: '' };

export function StudentFormModal({ student, onClose }) {
  const { toast } = useFeedback();
  const isNew = !student;
  const [f, setF] = useState(() => (student ? { ...blank, ...student } : blank));
  const [emailTouched, setEmailTouched] = useState(!isNew);
  const [invite, setInvite] = useState(true);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // New students: suggest the school email from the name until the counselor edits it.
  const setName = (key) => (e) => {
    const next = { ...f, [key]: e.target.value };
    if (!emailTouched && next.first_name.trim() && next.last_name.trim()) next.email = expectedEmail(next.first_name, next.last_name);
    setF(next);
  };
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value });

  const save = async () => {
    const e = {};
    if (!f.first_name.trim()) e.first_name = 'Please enter the first name.';
    if (!f.last_name.trim()) e.last_name = 'Please enter the last name.';
    if (!f.email.trim()) e.email = 'Please enter the school email.';
    const sid = normalizeStudentId(f.student_id);
    if (!STUDENT_ID.pattern.test(sid)) e.student_id = `Use ${STUDENT_ID.rule}, for example ${STUDENT_ID.example}.`;
    if (!f.grade_level) e.grade_level = 'Please select the year level.';
    if (!f.section.trim()) e.section = 'Please enter the section.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const data = { ...f, student_id: sid, email: f.email.trim().toLowerCase() };
      if (isNew) {
        const res = await createStudent({ ...data, invite });
        toast(res.invited ? 'Student added and invitation email sent.' : 'Student added.');
        onClose();
        navigate(`/c/students/${res.id}`);
      } else {
        await updateStudent({ id: student.id, ...data });
        toast('Student details saved.');
        onClose();
      }
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
      title={isNew ? 'Add student' : 'Edit student'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {isNew ? 'Add student' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
        <div className="grid-2 tight">
          <TextField label="First name" value={f.first_name} onChange={setName('first_name')} error={errors.first_name} />
          <TextField label="Last name" value={f.last_name} onChange={setName('last_name')} error={errors.last_name} />
        </div>
        <TextField
          label="School email"
          type="email"
          value={f.email}
          onChange={(e) => {
            setEmailTouched(true);
            set('email')(e);
          }}
          error={errors.email}
          placeholder={`lastnamefirstname@${SCHOOL.emailDomain}`}
        />
        <TextField
          label="Student ID"
          value={f.student_id}
          onChange={(e) => setF({ ...f, student_id: normalizeStudentId(e.target.value).slice(0, 7) })}
          error={errors.student_id}
          placeholder={STUDENT_ID.example}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="grid-2 tight">
          <SelectField label="Year level" value={f.grade_level} onChange={set('grade_level')} options={YEAR_LEVELS} placeholder="Select…" error={errors.grade_level} />
          <TextField label="Section" value={f.section} onChange={set('section')} error={errors.section} placeholder="e.g. BSIT-2A" />
        </div>
        {isNew && (
          <label className="check-label">
            <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} /> Email the student an invitation to set their password
          </label>
        )}
        {isNew && <p className="muted small">The student signs in with this school email after setting a password through “Forgot password”.</p>}
      </div>
    </Modal>
  );
}

export function DeleteStudentModal({ student, onClose }) {
  const { toast } = useFeedback();
  const expected = student.student_id || student.email;
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = typed.trim().toUpperCase() === expected.toUpperCase();

  const remove = async () => {
    setBusy(true);
    try {
      await deleteStudent(student.id, typed);
      toast('Student account deleted.');
      onClose();
      navigate('/c/students', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Delete student permanently?"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={remove} disabled={!matches} loading={busy}>
            Delete permanently
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <Alert tone="error" title="This can’t be undone.">
          The account and all of its data will be erased: mood check-ins, Wellness Check results, journal entries, appointments and notifications. To keep the history, archive the student instead.
        </Alert>
        <TextField label={`Type ${expected} to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} error={error} autoComplete="off" spellCheck={false} />
      </div>
    </Modal>
  );
}
