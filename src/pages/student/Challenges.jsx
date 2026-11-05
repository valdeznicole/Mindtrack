import { useDB } from '../../lib/store';
import { dailyChallenges, isChallengeDone, toggleChallenge } from '../../lib/actions';
import { Card, EmptyState, PageHeader, ProgressRing, useFeedback, Emoji, emojify } from '../../components/ui';

export default function Challenges({ user }) {
  const db = useDB();
  const { toast } = useFeedback();
  const today = dailyChallenges(db);
  const done = today.filter((c) => isChallengeDone(db, user.id, c.id)).length;
  const others = db.challenges.filter((c) => c.active && !today.includes(c));

  const toggle = async (c) => {
    const nowDone = await toggleChallenge(user.id, c.id);
    if (nowDone) toast(done + 1 === today.length ? 'All of today’s challenges done — wonderful! 🌱' : 'Nice! Challenge complete 🌱');
  };

  return (
    <>
      <PageHeader back="/s/wellness" title="Today’s Challenge 🌱" subtitle="Small, kind things you can do for yourself today." />
      {today.length === 0 ? (
        <EmptyState emoji="🌱" title="No challenges today" message="Your guidance office hasn’t set any challenges yet." />
      ) : (
        <>
          <Card className="challenge-summary">
            <ProgressRing value={done} max={today.length} size={110} stroke={11} color="#E59A2F" label={`${done} of ${today.length} challenges completed`}>
              <span className="ring-value sm">
                {done} / {today.length}
              </span>
            </ProgressRing>
            <div>
              <h2>{emojify(done === today.length ? 'All done for today! 🎉' : 'You’ve got this')}</h2>
              <p className="muted">Complete them in any order. Every small step counts.</p>
            </div>
          </Card>
          <ul className="challenge-list">
            {today.map((c) => {
              const isDone = isChallengeDone(db, user.id, c.id);
              return (
                <li key={c.id} className={`challenge-item ${isDone ? 'done' : ''}`}>
                  <span className="challenge-emoji" aria-hidden="true">
                    <Emoji e={c.emoji} />
                  </span>
                  <div>
                    <h3>{c.title}</h3>
                    <p className="muted small">{c.description}</p>
                  </div>
                  <div className="challenge-actions">
                    {c.link && !isDone && (
                      <a href={`#${c.link}`} className="btn btn-ghost btn-sm">
                        Start
                      </a>
                    )}
                    <button className={`check-btn ${isDone ? 'on' : ''}`} aria-pressed={isDone} onClick={() => toggle(c)}>
                      <span aria-hidden="true">{isDone ? '✓' : ''}</span>
                      <span className="sr-only">{isDone ? `Mark "${c.title}" as not done` : `Mark "${c.title}" as done`}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {others.length > 0 && (
        <Card>
          <h2 className="h3">More ideas for your day</h2>
          <ul className="idea-grid">
            {others.map((c) => (
              <li key={c.id}>
                <span aria-hidden="true"><Emoji e={c.emoji} /></span> {c.title}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
