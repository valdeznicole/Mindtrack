import { useDB } from '../../lib/store';
import { byId, fullName } from '../../lib/selectors';
import { updateSettings } from '../../lib/actions';
import { Avatar, Card, PageHeader, SectionTitle, Toggle, useFeedback, Emoji } from '../../components/ui';
import { ChangePasswordButton, SecurityLogList } from '../../components/account';
import { useAuth } from '../../App';
import { AppearanceSetting } from '../../components/ThemeToggle';
import { SCHOOL, SECURITY, FLAG_RULES } from '../../config';

export default function Settings({ user }) {
  const db = useDB();
  const { toast } = useFeedback();
  const { requestLogout } = useAuth();
  const s = user.settings;

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account, notifications and security." />
      <Card className="profile-card">
        <Avatar user={user} size={72} />
        <div>
          <h2>
            {user.first_name} {user.last_name}
          </h2>
          <p className="muted">
            {user.title || 'Guidance Counselor'} · {user.email}
          </p>
          <span className="pill pill-green">✓ Verified SMCBI account</span>
        </div>
      </Card>

      <div className="grid-2">
        <Card>
          <SectionTitle>Account</SectionTitle>
          <AppearanceSetting />
          <ChangePasswordButton user={user} />
          <button className="settings-row danger" onClick={requestLogout}>
            <span aria-hidden="true">↩</span>
            <span>Log out</span>
            <span aria-hidden="true">›</span>
          </button>
          <Toggle
            checked={s.notifications.appointment}
            onChange={async (v) => {
              await updateSettings({ ...s, notifications: { ...s.notifications, appointment: v } });
              toast('Notification settings saved.');
            }}
            label="Appointment request notifications"
          />
        </Card>
        <Card>
          <SectionTitle>Privacy & security controls</SectionTitle>
          <ul className="check-list small">
            <li><Emoji e="🔐" /> Only verified @{SCHOOL.emailDomain} accounts can sign in</li>
            <li><Emoji e="🔑" /> Passwords hashed on the server with bcrypt (per-user salt)</li>
            <li><Emoji e="⏱️" /> Sessions end after {SECURITY.sessionIdleMinutes} minutes of inactivity</li>
            <li><Emoji e="🚫" /> Sign-in locks for {SECURITY.lockoutMinutes} minutes after {SECURITY.maxLoginAttempts} failed attempts</li>
            <li><Emoji e="👥" /> Role-based access — students never see other students’ data</li>
            <li><Emoji e="📝" /> Journals visible to counselors only when explicitly shared</li>
            <li><Emoji e="👁️" /> Access to individual student profiles is logged</li>
            <li><Emoji e="🚩" /> Review flag thresholds: survey &lt; {FLAG_RULES.surveyScoreBelow}, critical item, {FLAG_RULES.lowMoodDaysInWeek}+ low-mood days/week</li>
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle>Security event log</SectionTitle>
        <SecurityLogList entries={db.securityLog.slice(0, 25)} showUser={(e) => (e.user_id ? fullName(byId(db, e.user_id)) : e.detail || 'Unknown')} />
      </Card>
    </>
  );
}
