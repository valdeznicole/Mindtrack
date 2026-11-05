import { useState } from 'react';
import AuthShell from './AuthShell';
import { ROLES, RoleChooser } from './Welcome';
import { Alert, Button, PasswordField, TextField, useFeedback, Emoji } from '../../components/ui';
import { checkSchoolEmail, login, setPending } from '../../lib/auth';
import { navigate } from '../../lib/router';
import { useAuth } from '../../App';
import { SCHOOL } from '../../config';

// /login?role=student or /login?role=counselor. Without a role, ask which one first.
export default function Login({ query }) {
  const role = ROLES[query?.role] ? query.role : null;
  return <AuthShell title="Log in">{role ? <LoginForm role={role} /> : <RoleChooser />}</AuthShell>;
}

function LoginForm({ role }) {
  const { signIn } = useAuth();
  const { toast } = useFeedback();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [wrongRole, setWrongRole] = useState(null);
  const [deletedAccount, setDeletedAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const r = ROLES[role];
  const isCounselor = role === 'counselor';

  const onEmailBlur = () => {
    if (!email) return;
    const c = checkSchoolEmail(email);
    setErrors((e) => ({ ...e, email: c.ok ? '' : c.error }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    setWrongRole(null);
    setDeletedAccount(false);
    const c = checkSchoolEmail(email);
    const next = { email: c.ok ? '' : c.error, password: password ? '' : 'Please enter your password.' };
    setErrors(next);
    if (next.email || next.password) return;
    setLoading(true);
    try {
      const res = await login(email, password, role);
      if (res.unverified) {
        setPending({ email: res.email });
        toast('Please verify your SMCBI email to continue. We sent you a new code.', 'info');
        navigate('/register');
        return;
      }
      if (!res.ok) {
        setFormError(res.error);
        setWrongRole(ROLES[res.wrongRole] ? res.wrongRole : null);
        setDeletedAccount(!!res.deleted);
        return;
      }
      signIn();
      toast(`Welcome back, ${res.user.first_name}!`);
      navigate(res.user.role === 'counselor' ? '/c/dashboard' : '/s/home');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <span className="role-pill">
        <span aria-hidden="true"><Emoji e={r.emoji} /></span> {r.title} login
        <a href="#/login" aria-label="Choose a different role">
          Change
        </a>
      </span>
      <h1>Welcome back <Emoji e="👋" /></h1>
      <p className="subtitle">{isCounselor ? 'Sign in to the guidance dashboard.' : 'Take a moment for yourself.'}</p>

      {formError && (
        <Alert tone="error">
          {formError}
          {deletedAccount && (
            <>
              {' '}
              <a href="#/register">Create a new account</a>
            </>
          )}
          {wrongRole && (
            <>
              {' '}
              <a href={`#/login?role=${wrongRole}`} onClick={() => setFormError('')}>
                Switch to {ROLES[wrongRole].title} login
              </a>
            </>
          )}
        </Alert>
      )}

      <form onSubmit={submit} noValidate className="form-stack">
        <TextField
          label="SMCBI Email"
          type="email"
          autoComplete="username"
          placeholder={`lastnamefirstname@${SCHOOL.emailDomain}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={onEmailBlur}
          error={errors.email}
          hint={`Use your official @${SCHOOL.emailDomain} school email.`}
        />
        <PasswordField label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="form-row-end">
          <a href="#/forgot" className="text-link">
            Forgot Password?
          </a>
        </div>
        <Button type="submit" size="lg" className="btn-block" loading={loading}>
          {loading ? 'Logging in…' : 'Log In'}
        </Button>
      </form>

      {isCounselor ? (
        <p className="auth-switch">Counselor accounts are set up by the guidance office.</p>
      ) : (
        <p className="auth-switch">
          Don’t have an account? <a href="#/register">Create Account</a>
        </p>
      )}
    </>
  );
}
