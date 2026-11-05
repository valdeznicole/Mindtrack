import { useState } from 'react';
import { useDB } from '../../lib/store';
import { activeFlags, byId, fullName } from '../../lib/selectors';
import { timeAgo } from '../../lib/dates';
import { reviewFlag } from '../../lib/actions';
import { navigate } from '../../lib/router';
import { FLAG_RULES } from '../../config';
import { Button, Card, EmptyState, PageHeader, StatusPill, Tabs, useFeedback, Emoji } from '../../components/ui';

export default function NeedsReview({ user }) {
  const db = useDB();
  const flagList = activeFlags(db);
  const { confirm, toast } = useFeedback();
  const [tab, setTab] = useState('open');
  const groups = {
    open: flagList.filter((f) => f.status === 'open'),
    follow_up: flagList.filter((f) => f.status === 'follow_up'),
    reviewed: flagList.filter((f) => f.status === 'reviewed'),
  };
  const list = [...groups[tab]].sort((a, b) => b.created_at - a.created_at);

  const act = async (f, status) => {
    const s = byId(db, f.user_id);
    const ok = await confirm(
      status === 'reviewed'
        ? { title: 'Mark as reviewed?', message: `Student #${s.student_id}’s ${f.source.toLowerCase()} flag will move to Reviewed.`, confirmLabel: 'Mark as Reviewed' }
        : { title: 'Follow up?', message: `Student #${s.student_id} will receive a friendly, non-alarming invitation to book a session.`, confirmLabel: 'Send invitation' },
    );
    if (!ok) return;
    await reviewFlag(f.id, user.id, status);
    toast(status === 'reviewed' ? 'Marked as reviewed.' : 'Follow-up invitation sent.');
  };

  return (
    <>
      <PageHeader title="Needs Review" subtitle="Responses that met the school’s review criteria. These are prompts for a conversation — not diagnoses." />
      <Tabs
        label="Review status"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'open', label: 'Needs review', count: groups.open.length },
          { value: 'follow_up', label: 'Follow-up', count: groups.follow_up.length },
          { value: 'reviewed', label: 'Reviewed', count: groups.reviewed.length },
        ]}
      />
      <div className="tab-panel" role="tabpanel">
        {list.length === 0 ? (
          <EmptyState emoji="🌿" title="Nothing here" message={tab === 'open' ? 'No responses currently need review.' : undefined} />
        ) : (
          <div className="flag-grid">
            {list.map((f) => {
              const s = byId(db, f.user_id);
              return (
                <Card key={f.id} className="flag-card">
                  <div className="flag-top">
                    <strong>Student #{s.student_id}</strong>
                    <StatusPill status={f.status} />
                  </div>
                  <p className="flag-source">
                    <Emoji e={f.source === 'Wellness Check' ? '📋' : '💚'} /> {f.source}
                  </p>
                  <p>May warrant counselor review</p>
                  <p className="muted small">{f.reason}</p>
                  <p className="tiny muted">
                    {timeAgo(f.created_at)} · {s.grade_level}
                    {f.reviewed_by && ` · by ${fullName(byId(db, f.reviewed_by))}`}
                  </p>
                  <div className="btn-row">
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/c/students/${s.id}?tab=${f.source === 'Wellness Check' ? 'surveys' : 'mood'}`)}>
                      Review
                    </Button>
                    {f.status !== 'reviewed' && (
                      <Button size="sm" onClick={() => act(f, 'reviewed')}>
                        Mark as Reviewed
                      </Button>
                    )}
                    {f.status === 'open' && (
                      <Button size="sm" variant="ghost" onClick={() => act(f, 'follow_up')}>
                        Follow Up
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Card className="criteria">
        <h2 className="h4">Review criteria (school-approved)</h2>
        <ul className="small muted">
          <li>Wellness Check score below {FLAG_RULES.surveyScoreBelow}</li>
          <li>“Often” or “Very often” on a critical wellness item</li>
          <li>{FLAG_RULES.lowMoodDaysInWeek}+ Sad, Lonely, Anxious or Overwhelmed check-ins within 7 days</li>
        </ul>
        <p className="tiny muted">Counselors and school personnel remain responsible for decisions about student support. For urgent situations, follow the school’s crisis protocol.</p>
      </Card>
    </>
  );
}
