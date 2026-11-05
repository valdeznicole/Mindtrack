import { useState } from 'react';
import { useDB } from '../../lib/store';
import { todayISO } from '../../lib/dates';
import { MOODS } from '../../lib/moods';
import { saveJournal } from '../../lib/actions';
import { navigate } from '../../lib/router';
import { Alert, Button, Card, EmptyState, LinkButton, PageHeader, TextField, Toggle, useFeedback, MoodIcon } from '../../components/ui';

export default function JournalEditor({ user, params }) {
  const db = useDB();
  const { toast, confirm } = useFeedback();
  const existing = params.id ? db.journals.find((j) => j.id === params.id && j.user_id === user.id) : null;
  const [f, setF] = useState(() => ({
    title: existing?.title || '',
    content: existing?.content || '',
    mood: existing?.mood || db.moods.find((m) => m.user_id === user.id && m.date === todayISO())?.mood || '',
    tags: existing?.tags || [],
    date: existing?.date || todayISO(),
    is_shared: existing?.is_shared || false,
  }));
  const [initial] = useState(() => JSON.stringify(f));
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(f) !== initial;

  if (params.id && !existing) return <EmptyState emoji="🔍" title="Entry not found" action={<LinkButton to="/s/journal">Back to journal</LinkButton>} />;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '').replace(/[^a-z0-9-]/g, '');
    if (t && !f.tags.includes(t) && f.tags.length < 8) setF({ ...f, tags: [...f.tags, t] });
    setTagInput('');
  };

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.content.trim()) er.content = 'Write a few words before saving.';
    if (f.date > todayISO()) er.date = 'The date can’t be in the future.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    let id;
    try {
      id = await saveJournal(user.id, { ...f, id: existing?.id });
    } catch {
      setSaving(false); // the error is shown as a toast; the draft stays in the editor
      return;
    }
    toast(f.is_shared ? 'Entry saved and shared with your counselor.' : 'Entry saved privately 🔒');
    navigate(`/s/journal/${id}`, { replace: true });
  };

  const cancel = async () => {
    if (!dirty || (await confirm({ title: 'Discard changes?', message: 'Your unsaved writing will be lost.', confirmLabel: 'Discard', tone: 'danger' }))) {
      navigate(existing ? `/s/journal/${existing.id}` : '/s/journal');
    }
  };

  return (
    <>
      <PageHeader title={existing ? 'Edit Entry' : 'New Entry'} subtitle="A private space for your thoughts." />
      <form onSubmit={save} noValidate>
        <Card className="editor">
          <div className="grid-2 tight">
            <TextField label="Title" placeholder="Give your entry a title (optional)" value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <TextField label="Date" type="date" value={f.date} max={todayISO()} onChange={(e) => setF({ ...f, date: e.target.value })} error={errors.date} />
          </div>

          <fieldset className="mood-inline">
            <legend>Mood</legend>
            <div className="chip-row">
              {MOODS.map((m) => (
                <button key={m.key} type="button" className={`chip ${f.mood === m.key ? 'on' : ''}`} aria-pressed={f.mood === m.key} style={f.mood === m.key ? { background: m.soft, borderColor: m.color, color: m.ink } : undefined} onClick={() => setF({ ...f, mood: f.mood === m.key ? '' : m.key })}>
                  <MoodIcon mood={m.key} size={24} /> {m.label}
                </button>
              ))}
            </div>
          </fieldset>

          <TextField as="textarea" label="Journal content" rows={10} className="journal-text" placeholder="What’s on your mind? Write freely — this is your space." value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} error={errors.content} maxLength={5000} />

          <div className="field">
            <label htmlFor="tag-input">Tags</label>
            <div className="tag-editor">
              {f.tags.map((t) => (
                <span key={t} className="tag removable">
                  #{t}
                  <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setF({ ...f, tags: f.tags.filter((x) => x !== t) })}>
                    ✕
                  </button>
                </span>
              ))}
              <input
                id="tag-input"
                value={tagInput}
                placeholder="Add a tag and press Enter"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
              />
            </div>
          </div>

          <div className={`share-box ${f.is_shared ? 'on' : ''}`}>
            <Toggle checked={f.is_shared} onChange={(v) => setF({ ...f, is_shared: v })} label="Share with Counselor" description={f.is_shared ? undefined : '🔒 Private — only you can see this entry.'} />
            {f.is_shared && (
              <Alert tone="info" icon="💬">
                This entry will be available to your authorized counselor.
              </Alert>
            )}
          </div>

          <div className="btn-row end">
            <Button type="button" variant="ghost" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Entry
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}
