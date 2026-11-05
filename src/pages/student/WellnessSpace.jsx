import { useDB } from '../../lib/store';
import { dailyChallenges, isChallengeDone } from '../../lib/actions';
import { Card, LinkButton, PageHeader, SectionTitle, Emoji } from '../../components/ui';

const ACTIVITIES = [
  { to: '/s/breathe', emoji: '🫁', title: 'Guided Breathing', text: 'Follow a calm circle as you breathe in, hold, and breathe out.', meta: '1 – 5 minutes', tint: 'linear-gradient(150deg, #DAE6EA, #E4F0E8)' },
  { to: '/s/bubbles', emoji: '🫧', title: 'Bubble Wrap', text: 'Pop a sheet of bubble wrap, one satisfying pop at a time, with soft pop sounds.', meta: 'No timer', tint: 'linear-gradient(150deg, #EEE8F4, #E5EEF0)' },
  { to: '/s/challenges', emoji: '🌱', title: 'Daily Wellness Challenge', text: 'Three small, kind things you can do for yourself today.', meta: '3 per day', tint: 'linear-gradient(150deg, #FEEBD1, #FAF5D6)' },
];

export default function WellnessSpace({ user }) {
  const db = useDB();
  const ch = dailyChallenges(db);
  const done = ch.filter((c) => isChallengeDone(db, user.id, c.id)).length;
  const lastSurvey = db.surveyResponses.filter((r) => r.user_id === user.id).sort((a, b) => b.submitted_at - a.submitted_at)[0];

  return (
    <>
      <PageHeader title="Wellness Space" subtitle="Take a few minutes for yourself." />
      <div className="space-grid">
        {ACTIVITIES.map((a) => (
          <a key={a.to} href={`#${a.to}`} className="space-card" style={{ background: a.tint }}>
            <span className="space-emoji" aria-hidden="true">
              <Emoji e={a.emoji} />
            </span>
            <h2>{a.title}</h2>
            <p>{a.text}</p>
            <span className="space-meta">
              {a.meta}
              {a.to === '/s/challenges' && ` · ${done}/${ch.length} done today`}
            </span>
            <span className="space-go" aria-hidden="true">
              Start →
            </span>
          </a>
        ))}
      </div>

      <Card className="survey-cta">
        <div className="survey-cta-emoji" aria-hidden="true">
          <Emoji e="📋" />
        </div>
        <div>
          <SectionTitle>Wellness Check</SectionTitle>
          <p className="muted">Short questions to help you reflect on how you’ve been. There are no right or wrong answers.</p>
          {lastSurvey && <p className="small muted">Last completed {new Date(lastSurvey.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.</p>}
        </div>
        <LinkButton to="/s/survey">Start Wellness Check</LinkButton>
      </Card>
    </>
  );
}
