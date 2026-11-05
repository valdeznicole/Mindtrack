import { useState } from 'react';
import { changePassword, checkPassword } from '../lib/auth';
import { fmtDateTime } from '../lib/dates';
import { Button, Modal, PasswordField, useFeedback, Emoji, emojify } from './ui';

export function ChangePasswordButton({ user }) {
  const { toast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const close = () => {
    setOpen(false);
    setF({ current: '', next: '', confirm: '' });
    setErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.current) er.current = 'Please enter your current password.';
    const p = checkPassword(f.next);
    if (p) er.next = p;
    else if (f.next === f.current) er.next = 'Choose a password different from your current one.';
    if (f.next !== f.confirm) er.confirm = 'Passwords don’t match.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    let res;
    try {
      res = await changePassword(user.id, f.current, f.next);
    } catch (err) {
      res = { ok: false, error: err.message };
    } finally {
      setLoading(false);
    }
    if (!res.ok) return setErrors({ current: res.error });
    toast('Your password has been changed.');
    close();
  };

  return (
    <>
      <button className="settings-row" onClick={() => setOpen(true)}>
        <span aria-hidden="true"><Emoji e="🔑" /></span>
        <span>Change Password</span>
        <span aria-hidden="true">›</span>
      </button>
      <Modal open={open} onClose={close} title="Change Password">
        <form onSubmit={submit} noValidate className="form-stack" id="pw-form">
          <PasswordField label="Current Password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} error={errors.current} />
          <PasswordField label="New Password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} error={errors.next} hint="At least 8 characters with a letter and a number." />
          <PasswordField label="Confirm New Password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} error={errors.confirm} />
          <div className="btn-row end">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

const EVENT_LABELS = {
  login: '✅ Signed in',
  logout: '↩ Signed out',
  login_failed: '⚠️ Failed sign-in attempt',
  login_blocked_domain: '⛔ Blocked non-SMCBI email',
  session_timeout: '⏱️ Signed out after inactivity',
  register: '📝 Account created',
  email_verified: '📧 Email verified',
  profile_completed: '👤 Profile completed',
  password_changed: '🔑 Password changed',
  password_reset: '🔑 Password reset',
  journal_shared: '💬 Journal entry shared',
  journal_saved_private: '🔒 Journal entry saved privately',
  journal_deleted: '🗑️ Journal entry deleted',
  student_profile_viewed: '👁️ Student wellness profile viewed',
  student_created: '👤 Student account created',
  student_updated: '📝 Student details updated',
  student_archived: '🔒 Student archived',
  student_restored: '✅ Student restored',
  student_deleted: '🗑️ Student account deleted',
  login_archived: '⛔ Sign-in blocked: archived account',
  counselor_created: '👥 Counselor account created',
  counselor_promoted: '🔑 Account made counselor',
  shared_journal_viewed: '👁️ Shared journal viewed',
  flag_reviewed: '✔ Review flag marked reviewed',
  flag_follow_up: '↻ Review flag set to follow-up',
};

export function SecurityLogList({ entries, showUser }) {
  if (!entries.length) return <p className="muted">No security events yet.</p>;
  return (
    <ul className="log-list">
      {entries.map((e) => (
        <li key={e.id}>
          <span>{emojify(EVENT_LABELS[e.type] || e.type)}</span>
          {showUser && <span className="muted small">{showUser(e)}</span>}
          <time className="muted small">{fmtDateTime(e.at)}</time>
        </li>
      ))}
    </ul>
  );
}
