import { useDB } from '../../lib/store';
import { fmtLong, fmtDateTime } from '../../lib/dates';
import { MOOD } from '../../lib/moods';
import { deleteJournal, saveJournal } from '../../lib/actions';
import { navigate } from '../../lib/router';
import { Button, Card, EmptyState, LinkButton, MoodBadge, PageHeader, Toggle, useFeedback, emojify } from '../../components/ui';

export default function JournalView({ user, params }) {
  const db = useDB();
  const { toast, confirm } = useFeedback();
  const j = db.journals.find((x) => x.id === params.id && x.user_id === user.id);
  if (!j) return <EmptyState emoji="🔍" title="Entry not found" action={<LinkButton to="/s/journal">Back to journal</LinkButton>} />;

  const toggleShare = async (v) => {
    const ok = await confirm(
      v
        ? { title: 'Share this entry?', message: 'This entry will be available to your authorized counselor. You can stop sharing anytime.', confirmLabel: 'Share' }
        : { title: 'Stop sharing?', message: 'Counselors will no longer be able to view this entry.', confirmLabel: 'Make private' },
    );
    if (!ok) return;
    await saveJournal(user.id, { ...j, is_shared: v });
    toast(v ? 'Shared with your counselor.' : 'This entry is private again 🔒');
  };

  const remove = async () => {
    if (await confirm({ title: 'Delete this entry?', message: 'This can’t be undone.', confirmLabel: 'Delete', tone: 'danger' })) {
      // Leave the page first so it doesn't render the entry after the refreshed data drops it.
      navigate('/s/journal', { replace: true });
      await deleteJournal(user.id, j.id);
      toast('Entry deleted.');
    }
  };

  return (
    <>
      <PageHeader
        back="/s/journal"
        title={j.title}
        subtitle={fmtLong(j.date)}
        actions={
          <>
            <LinkButton to={`/s/journal/${j.id}/edit`} variant="secondary">
              Edit
            </LinkButton>
            <Button variant="danger-soft" onClick={remove}>
              Delete
            </Button>
          </>
        }
      />
      <Card className="journal-read" style={{ '--tint': MOOD[j.mood]?.soft || 'var(--surface)' }}>
        <div className="chip-row">
          {j.mood && <MoodBadge mood={j.mood} />}
          <span className={`pill ${j.is_shared ? 'pill-blue' : 'pill-gray'}`}>{emojify(j.is_shared ? '💬 Shared with counselor' : '🔒 Private')}</span>
          {j.tags.map((t) => (
            <span key={t} className="tag">
              #{t}
            </span>
          ))}
        </div>
        <div className="journal-body">{j.content}</div>
        <p className="tiny muted">Last edited {fmtDateTime(j.updated_at)}</p>
      </Card>
      <Card>
        <Toggle checked={j.is_shared} onChange={toggleShare} label="Share with Counselor" description={j.is_shared ? 'Your authorized counselor can view this entry.' : 'Only you can see this entry.'} />
      </Card>
    </>
  );
}
