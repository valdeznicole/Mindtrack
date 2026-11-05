import { useEffect, useState } from 'react';
import AuthShell from './AuthShell';
import OtpInput from './OtpInput';
import { Alert, Avatar, Button, PasswordField, SelectField, TextField, useFeedback, Emoji } from '../../components/ui';
import { checkPassword, checkSchoolEmail, expectedEmail, getPending, otpCooldown, registerAccount, resendCode, setPending, verifyEmail } from '../../lib/auth';
import { completeProfile } from '../../lib/actions';
import { navigate } from '../../lib/router';
import { useAuth } from '../../App';
import { SCHOOL, STUDENT_ID, YEAR_LEVELS, normalizeStudentId } from '../../config';

const STEPS = ['Account', 'Verify', 'Profile'];

export default function Register() {
  const { user } = useAuth();
  const [pending, setPend] = useState(getPending);
  const step = user && !user.profile_complete ? 2 : pending?.email ? 1 : 0;

  const updatePending = (p) => {
    setPending(p);
    setPend(p);
  };

  return (
    <AuthShell title="Create account">
      <ol className="stepper" aria-label="Registration progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="step-num">{i < step ? '✓' : i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {step === 0 && <AccountStep onDone={(email) => updatePending({ email })} />}
      {step === 1 && <VerifyStep email={pending.email} onRestart={() => updatePending(null)} onVerified={() => updatePending(null)} />}
      {step === 2 && <ProfileStep user={user} />}
    </AuthShell>
  );
}

function AccountStep({ onDone }) {
  const [f, setF] = useState({ first: '', last: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (!f.first.trim()) e.first = 'Please enter your first name.';
    if (!f.last.trim()) e.last = 'Please enter your last name.';
    const c = checkSchoolEmail(f.email);
    if (!c.ok) e.email = c.error;
    else if (f.first.trim() && f.last.trim() && c.email !== expectedEmail(f.first, f.last)) {
      e.email = `Your SMCBI email should follow lastnamefirstname — for example ${expectedEmail(f.first, f.last)}`;
    }
    const pw = checkPassword(f.password);
    if (pw) e.password = pw;
    if (!f.confirm) e.confirm = 'Please confirm your password.';
    else if (f.confirm !== f.password) e.confirm = 'Passwords don’t match.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      if (e.email?.startsWith('Access restricted')) setFormError(e.email);
      return;
    }
    setLoading(true);
    try {
      const email = f.email.trim().toLowerCase();
      const res = await registerAccount({ first: f.first.trim(), last: f.last.trim(), email, password: f.password });
      if (!res.ok) setFormError(res.error);
      else onDone(email);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>Create your account</h1>
      <p className="subtitle">Use your official @{SCHOOL.emailDomain} school email.</p>
      {formError && <Alert tone="error">{formError}</Alert>}
      <form onSubmit={submit} noValidate className="form-stack">
        <div className="grid-2 tight">
          <TextField label="First Name" autoComplete="given-name" value={f.first} onChange={set('first')} error={errors.first} />
          <TextField label="Last Name" autoComplete="family-name" value={f.last} onChange={set('last')} error={errors.last} />
        </div>
        <TextField
          label="SMCBI Email"
          type="email"
          autoComplete="email"
          placeholder={`lastnamefirstname@${SCHOOL.emailDomain}`}
          value={f.email}
          onChange={set('email')}
          error={errors.email}
          hint={f.first && f.last ? `Expected: ${expectedEmail(f.first, f.last)}` : `Format: lastnamefirstname@${SCHOOL.emailDomain}`}
        />
        <PasswordField label="Password" autoComplete="new-password" value={f.password} onChange={set('password')} error={errors.password} hint="At least 8 characters with a letter and a number." />
        <PasswordField label="Confirm Password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" size="lg" className="btn-block" loading={loading}>
          Continue
        </Button>
      </form>
      <p className="auth-switch">
        Already have an account? <a href="#/login?role=student">Log in</a>
      </p>
    </>
  );
}

function VerifyStep({ email, onRestart, onVerified }) {
  const { signIn } = useAuth();
  const { toast } = useFeedback();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(() => otpCooldown(email, 'verify'));

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(otpCooldown(email, 'verify')), 1000);
    return () => clearTimeout(t);
  }, [cooldown, email]);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyEmail(email, code);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onVerified();
      signIn();
      toast('Email verified! Just one more step.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const res = await resendCode(email, 'verify');
      setCooldown(otpCooldown(email, 'verify'));
      if (!res.ok) return setError(res.error);
      setCode('');
      setError('');
      toast('A new code is on its way to your SMCBI email.', 'info');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="verify-icon" aria-hidden="true">
        <Emoji e="📧" />
      </div>
      <h1>Check your SMCBI email</h1>
      <p className="subtitle">
        We sent a 6-digit verification code to <strong>{email}</strong>. Your account will be activated once your email is verified.
      </p>
      <form onSubmit={submit} className="form-stack" noValidate>
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v);
            setError('');
          }}
          error={error}
          disabled={loading}
        />
        <Button type="submit" size="lg" className="btn-block" loading={loading}>
          Verify Email
        </Button>
      </form>
      <div className="verify-links">
        <button className="text-link" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        <button className="text-link" onClick={onRestart}>
          Use a different email
        </button>
      </div>
      <p className="muted small center">The code expires in 10 minutes.</p>
    </>
  );
}

function ProfileStep({ user }) {
  const { toast } = useFeedback();
  const [f, setF] = useState({ student_id: '', grade_level: '', section: '', photo: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setErrors({ ...errors, photo: 'Please choose an image file.' });
    if (file.size > 5 * 1024 * 1024) return setErrors({ ...errors, photo: 'Please choose an image smaller than 5 MB.' });
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const s = 256;
      c.width = c.height = s;
      const min = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, s, s);
      setF((prev) => ({ ...prev, photo: c.toDataURL('image/jpeg', 0.85) }));
      setErrors((er) => ({ ...er, photo: '' }));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    const id = normalizeStudentId(f.student_id);
    if (!STUDENT_ID.pattern.test(id)) e.student_id = `Use your school Student ID: ${STUDENT_ID.rule}, for example ${STUDENT_ID.example}.`;
    if (!f.grade_level) e.grade_level = 'Please select your year level.';
    if (!f.section.trim()) e.section = 'Please enter your section.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setLoading(true);
    try {
      await completeProfile({ student_id: id, grade_level: f.grade_level, section: f.section.trim().toUpperCase(), photo: f.photo });
    } catch (err) {
      setErrors({ [err.data?.field || 'section']: err.message });
      return;
    } finally {
      setLoading(false);
    }
    toast('Your account is ready. Welcome to MindTrack!');
    navigate('/s/home');
  };

  return (
    <>
      <h1>Your student profile</h1>
      <p className="subtitle">Almost there, {user.first_name}! This helps the guidance office support you.</p>
      <form onSubmit={submit} noValidate className="form-stack">
        <div className="photo-picker">
          <Avatar user={{ ...user, photo: f.photo }} size={72} />
          <div>
            <label className="btn btn-secondary btn-sm file-label">
              {f.photo ? 'Change photo' : 'Add profile picture'}
              <input type="file" accept="image/*" onChange={onPhoto} className="sr-only" />
            </label>
            <p className="hint">Optional</p>
            {errors.photo && <p className="error-text">{errors.photo}</p>}
          </div>
        </div>
        <TextField
          label="Student ID"
          placeholder={STUDENT_ID.example}
          value={f.student_id}
          onChange={(e) => setF({ ...f, student_id: normalizeStudentId(e.target.value).slice(0, 7) })}
          error={errors.student_id}
          hint={`Your school Student ID: ${STUDENT_ID.rule}.`}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="grid-2 tight">
          <SelectField label="Year Level" value={f.grade_level} onChange={set('grade_level')} options={YEAR_LEVELS} placeholder="Select…" error={errors.grade_level} />
          <TextField label="Section" placeholder="e.g. BSIT-3A" value={f.section} onChange={set('section')} error={errors.section} />
        </div>
        <Button type="submit" size="lg" className="btn-block" loading={loading}>
          Complete Registration
        </Button>
      </form>
    </>
  );
}
