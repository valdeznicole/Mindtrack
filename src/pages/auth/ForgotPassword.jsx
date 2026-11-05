import { useEffect, useState } from 'react';
import AuthShell from './AuthShell';
import OtpInput from './OtpInput';
import { Alert, Button, PasswordField, TextField, useFeedback } from '../../components/ui';
import { checkPassword, checkSchoolEmail, otpCooldown, requestReset, resendCode, resetPassword } from '../../lib/auth';
import { navigate } from '../../lib/router';
import { SCHOOL } from '../../config';

export default function ForgotPassword() {
  const { toast } = useFeedback();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(otpCooldown(email, 'reset')), 1000);
    return () => clearTimeout(t);
  }, [cooldown, email]);

  const resend = async () => {
    setFormError('');
    try {
      const res = await resendCode(email, 'reset');
      setCooldown(otpCooldown(email, 'reset'));
      if (!res.ok) return setFormError(res.error);
      setCode('');
      toast('If this email has a MindTrack account, a new code is on its way.', 'info');
    } catch (err) {
      setFormError(err.message);
    }
  };

  const changeEmail = () => {
    setStep(0);
    setCode('');
    setErrors({});
    setFormError('');
  };

  const sendCode = async (e) => {
    e.preventDefault();
    const c = checkSchoolEmail(email);
    if (!c.ok) return setErrors({ email: c.error });
    setLoading(true);
    // The server answers the same whether or not the account exists, so emails can't be enumerated.
    try {
      const res = await requestReset(c.email);
      if (!res.ok) return setErrors({ email: res.error });
    } catch (err) {
      return setErrors({ email: err.message });
    } finally {
      setLoading(false);
    }
    setEmail(c.email);
    setErrors({});
    setCooldown(otpCooldown(c.email, 'reset'));
    setStep(1);
  };

  const reset = async (e) => {
    e.preventDefault();
    setFormError('');
    const er = {};
    if (!/^\d{6}$/.test(code)) er.code = 'Please enter all 6 digits.';
    const p = checkPassword(pw);
    if (p) er.pw = p;
    if (pw !== pw2) er.pw2 = 'Passwords don’t match.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try {
      const res = await resetPassword(email, code, pw);
      if (!res.ok) return setErrors({ [res.field || 'code']: res.error });
    } catch (err) {
      return setFormError(err.message);
    } finally {
      setLoading(false);
    }
    toast('Your password has been reset. You can log in now.');
    navigate('/login');
  };

  return (
    <AuthShell title="Reset password">
      <a href="#/login" className="back-link">
        ← Back to log in
      </a>
      {step === 0 ? (
        <>
          <h1>Forgot your password?</h1>
          <p className="subtitle">Enter your SMCBI email and we’ll send you a code to reset it.</p>
          <form onSubmit={sendCode} noValidate className="form-stack">
            <TextField label="SMCBI Email" type="email" placeholder={`lastnamefirstname@${SCHOOL.emailDomain}`} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
            <Button type="submit" size="lg" className="btn-block" loading={loading}>
              Send reset code
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1>Check your SMCBI email</h1>
          <p className="subtitle">
            If <strong>{email}</strong> has a MindTrack account, we just emailed it a 6-digit code. Enter it below with your new password.
          </p>
          {formError && <Alert tone="error">{formError}</Alert>}
          <form onSubmit={reset} noValidate className="form-stack">
            <OtpInput value={code} onChange={setCode} error={errors.code} />
            <PasswordField label="New Password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={errors.pw} hint="At least 8 characters with a letter and a number." />
            <PasswordField label="Confirm New Password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} error={errors.pw2} />
            <Button type="submit" size="lg" className="btn-block" loading={loading}>
              Reset Password
            </Button>
          </form>
          <div className="verify-links">
            <button type="button" className="text-link" onClick={resend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
            <button type="button" className="text-link" onClick={changeEmail}>
              Use a different email
            </button>
          </div>
          <div className="reset-help">
            <p>
              <strong>No email yet?</strong> It can take a minute. Check your <strong>Spam</strong> or <strong>Promotions</strong> folder, and search for “MindTrack”.
            </p>
            <p>
              No MindTrack account with this email? <a href="#/register">Create an account</a> instead.
            </p>
          </div>
        </>
      )}
    </AuthShell>
  );
}
