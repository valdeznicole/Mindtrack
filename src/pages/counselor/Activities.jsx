import { useEffect, useId, useRef, useState } from 'react';
import { useDB } from '../../lib/store';
import { addDays, fmtShort, todayISO } from '../../lib/dates';
import { CHALLENGE_EMOJI } from '../../lib/emoji';
import { deleteChallenge, saveChallenge } from '../../lib/actions';
import { Alert, Button, Card, PageHeader, SectionTitle, TextField, Toggle, useFeedback, Emoji } from '../../components/ui';
import { BarChart } from '../../components/charts';
import { StatCard } from './Dashboard';

const TYPES = [
  { key: 'breathing', label: 'Breathing sessions', emoji: '🫁', color: '#B7D0D4' },
  { key: 'bubble_pop', label: 'Bubble Wrap sessions', emoji: '🫧', color: '#C8B8D8' },
  { key: 'challenge', label: 'Challenges completed', emoji: '🌱', color: '#FDBA5C' },
  { key: 'journal', label: 'Journal entries created', emoji: '📝', color: '#F2E6A0' },
];

export default function Activities() {
  const db = useDB();
  const { toast, confirm } = useFeedback();
  const since = addDays(todayISO(), -29);
  const acts = db.activities.filter((a) => a.date >= since);
  const weeks = Array.from({ length: 4 }, (_, w) => {
    const start = addDays(todayISO(), -(4 - w) * 7 + 1);
    const end = addDays(start, 6);
    return { label: fmtShort(start), value: acts.filter((a) => a.date >= start && a.date <= end).length };
  });
  const [form, setForm] = useState({ emoji: '🌿', title: '', description: '' });
  const [error, setError] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Please describe the challenge.');
    await saveChallenge({ emoji: form.emoji || '🌿', title: form.title.trim(), description: form.description.trim(), link: '' });
    setForm({ emoji: '🌿', title: '', description: '' });
    setError('');
    toast('Challenge added.');
  };

  const remove = async (c) => {
    if (await confirm({ title: 'Delete this challenge?', message: c.title, confirmLabel: 'Delete', tone: 'danger' })) {
      await deleteChallenge(c.id);
      toast('Challenge deleted.');
    }
  };

  return (
    <>
      <PageHeader title="Wellness Activities" subtitle="Engagement with MindTrack’s wellness tools over the last 30 days." />
      <Alert tone="info">Activity participation is not a measure or diagnosis of mental health.</Alert>
      <div className="stat-grid">
        {TYPES.map((t) => (
          <StatCard key={t.key} label={t.label} value={acts.filter((a) => a.activity_type === t.key).length} tint={`${t.color}55`} />
        ))}
      </div>
      <div className="grid-2">
        <Card>
          <SectionTitle>By activity</SectionTitle>
          <BarChart data={TYPES.map((t) => ({ label: t.emoji, value: acts.filter((a) => a.activity_type === t.key).length, color: t.color }))} ariaLabel={TYPES.map((t) => `${t.label}: ${acts.filter((a) => a.activity_type === t.key).length}`).join(', ')} />
        </Card>
        <Card>
          <SectionTitle>Weekly participation</SectionTitle>
          <BarChart data={weeks} ariaLabel="Wellness activities per week" color="#A7C8B5" />
        </Card>
      </div>

      <Card>
        <SectionTitle>Manage Daily Wellness Challenges</SectionTitle>
        <p className="muted small">Students see three active challenges each day, rotated automatically.</p>
        <ul className="manage-list">
          {db.challenges.map((c) => (
            <li key={c.id}>
              <span className="challenge-emoji" aria-hidden="true">
                <Emoji e={c.emoji} />
              </span>
              <div className="grow">
                <strong>{c.title}</strong>
                {c.description && <span className="muted small">{c.description}</span>}
              </div>
              <Toggle checked={c.active} onChange={(v) => saveChallenge({ id: c.id, active: v }).catch(() => {})} label={<span className="sr-only">Active: {c.title}</span>} />
              <button className="icon-btn" aria-label={`Delete challenge: ${c.title}`} onClick={() => remove(c)}>
                <Emoji e="🗑️" />
              </button>
            </li>
          ))}
        </ul>
        <form className="add-challenge" onSubmit={add} noValidate>
          <EmojiPicker value={form.emoji} onChange={(emoji) => setForm({ ...form, emoji })} />
          <TextField label="Challenge" placeholder="e.g. Stretch for 2 minutes" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={error} className="grow" />
          <TextField label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="grow" />
          <Button type="submit">Add</Button>
        </form>
      </Card>
    </>
  );
}

// Counselors pick a challenge icon from the Fluent set, so every challenge renders with the same emoji style.
function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="field emoji-picker" ref={ref}>
      <label htmlFor={id}>Icon</label>
      <button id={id} type="button" className="emoji-picker-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Emoji e={value} />
        <span className="sr-only">Choose an icon</span>
      </button>
      {open && (
        <div className="emoji-pop" role="listbox" aria-label="Challenge icons">
          {CHALLENGE_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              role="option"
              aria-selected={e === value}
              className={e === value ? 'on' : ''}
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
            >
              <Emoji e={e} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
