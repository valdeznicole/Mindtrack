import { useDB } from '../../lib/store';
import { updateSettings } from '../../lib/actions';
import { Avatar, Card, PageHeader, SectionTitle, Toggle, useFeedback, Emoji } from '../../components/ui';
import { ChangePasswordButton, SecurityLogList } from '../../components/account';
import { SupportInfo } from '../../components/common';
import { useAuth } from '../../App';
import { AppearanceSetting } from '../../components/ThemeToggle';

export default function Profile({ user }) {
  const db = useDB();
  const { toast } = useFeedback();
  const { requestLogout } = useAuth();
  const s = user.settings;

  const setNotif = async (k, v) => {
    await updateSettings({ ...s, notifications: { ...s.notifications, [k]: v } });
    toast('Notification settings saved.');
  };
  const setPrivacy = async (k, v) => {
    await updateSettings({ ...s, privacy: { ...s.privacy, [k]: v } });
    toast('Privacy settings saved.');
  };
  const log = db.securityLog.filter((e) => e.user_id === user.id).slice(0, 8);

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account, privacy and notification settings." />
      <Card className="profile-card">
        <Avatar user={user} size={88} />
        <div>
          <h2>
            {user.first_name} {user.last_name}
          </h2>
          <p className="muted">{user.email}</p>
          {user.officer_position && <span className="pill pill-lavender officer-pill"><Emoji e="🎓" /> Officer · {user.officer_position}</span>}{' '}
          <span className={`pill ${user.email_verified ? 'pill-green' : 'pill-orange'}`}>{user.email_verified ? '✓ Verified SMCBI email' : 'Email not verified'}</span>
        </div>
        <dl className="profile-facts">
          <div>
            <dt>Student ID</dt>
            <dd>{user.student_id}</dd>
          </div>
          <div>
            <dt>Year Level</dt>
            <dd>{user.grade_level}</dd>
          </div>
          <div>
            <dt>Section</dt>
            <dd>{user.section}</dd>
          </div>
        </dl>
      </Card>

      <div className="grid-2">
        <Card>
          <SectionTitle><Emoji e="🔔" /> Notification Settings</SectionTitle>
          <Toggle checked={s.notifications.mood} onChange={(v) => setNotif('mood', v)} label="Daily mood reminder" description="A gentle nudge to check in each day." />
          <Toggle checked={s.notifications.challenge} onChange={(v) => setNotif('challenge', v)} label="Daily wellness challenge" />
          <Toggle checked={s.notifications.journal} onChange={(v) => setNotif('journal', v)} label="Journal reminder" />
          <Toggle checked={s.notifications.appointment} onChange={(v) => setNotif('appointment', v)} label="Appointment reminders" />
        </Card>
        <Card>
          <SectionTitle><Emoji e="🔒" /> Privacy Settings</SectionTitle>
          <div className="privacy-facts">
            <p>
              <strong>Your journal is private.</strong> Counselors only see entries you choose to share.
            </p>
            <p>
              <strong>Mood levels & wellness indicator</strong> are visible to authorized guidance counselors so they can offer support early.
            </p>
          </div>
          <Toggle
            checked={s.privacy.share_mood_notes}
            onChange={(v) => setPrivacy('share_mood_notes', v)}
            label="Share mood notes & factors with counselors"
            description="Off by default. When off, counselors see your mood level but not what you wrote."
          />
        </Card>
      </div>

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
          <h3 className="h4">Recent account activity</h3>
          <SecurityLogList entries={log} />
        </Card>
        <Card className="support-card">
          <SectionTitle><Emoji e="🤝" /> Need support now?</SectionTitle>
          <SupportInfo />
        </Card>
      </div>
    </>
  );
}
