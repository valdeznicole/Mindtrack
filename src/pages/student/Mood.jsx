import { useState } from 'react';
import { useDB } from '../../lib/store';
import { MOODS, MOOD, FACTORS, ACTIVITIES, recommendationsFor } from '../../lib/moods';
import { moodsOf, todayMoodOf } from '../../lib/selectors';
import { saveMood } from '../../lib/actions';
import { navigate } from '../../lib/router';
import { Button, Card, EmptyState, LinkButton, Modal, PageHeader, Tabs, TextField, useFeedback, MoodIcon, Emoji, emojify } from '../../components/ui';
import { MoodCalendar, MoodDetail, MoodTimeline, SupportInfo } from '../../components/common';

export default function MoodPage({ user, query }) {
  const tab = query.tab || 'checkin';
  const setTab = (t) => navigate(`/s/mood${t === 'checkin' ? '' : `?tab=${t}`}`, { replace: true });
  return (
    <>
      <PageHeader title="Daily Mood" subtitle="Take a moment to check in with yourself." />
      <Tabs
        label="Daily mood sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'checkin', label: '💚 Check-In' },
          { value: 'history', label: '🕒 History' },
          { value: 'calendar', label: '🗓️ Calendar' },
        ]}
      />
      <div className="tab-panel" role="tabpanel">
        {tab === 'checkin' && <CheckIn user={user} query={query} />}
        {tab === 'history' && <History user={user} />}
        {tab === 'calendar' && <CalendarTab user={user} />}
      </div>
    </>
  );
}

function CheckIn({ user, query }) {
  const db = useDB();
  const { toast } = useFeedback();
  const existing = todayMoodOf(db, user.id);
  const [editing, setEditing] = useState(!existing || query.edit === '1');
  const [mood, setMood] = useState(query.m && MOOD[query.m] ? query.m : existing?.mood || '');
  const [note, setNote] = useState(existing?.note || '');
  const [factors, setFactors] = useState(existing?.mood_factors || []);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewOpen, setViewOpen] = useState(query.view === 'today');
  const [error, setError] = useState('');

  const toggleFactor = (k) => setFactors((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

  const save = async () => {
    if (!mood) {
      setError('Please choose the mood that fits best.');
      return;
    }
    setSaving(true);
    let res;
    try {
      res = await saveMood(user.id, { mood, note, factors });
    } catch {
      return; // the error is shown as a toast
    } finally {
      setSaving(false);
    }
    setSaved({ mood, updated: res.updated });
    setEditing(false);
    toast(res.updated ? 'Today’s mood has been updated.' : 'Your mood has been recorded. Thank you for checking in.');
  };

  if (saved) {
    const rec = recommendationsFor(saved.mood);
    const m = MOOD[saved.mood];
    return (
      <div className="success-view">
        <Card className="success-card tint-gradient" style={{ '--tint': m.soft }}>
          <div className="success-emoji pop-in">
            <MoodIcon mood={saved.mood} size={120} />
          </div>
          <h2>{saved.updated ? 'Your mood has been updated' : 'Your mood has been recorded'}</h2>
          <p className="muted">Thank you for taking a moment to check in with yourself.</p>
        </Card>
        <Card>
          <h2 className="h3">{rec.message}</h2>
          <div className="quick-grid">
            {rec.items.map((k) => (
              <a key={k} href={`#${ACTIVITIES[k].to}`} className="activity-card" style={{ '--tint': ACTIVITIES[k].color }}>
                <span className="activity-emoji" aria-hidden="true">
                  <Emoji e={ACTIVITIES[k].emoji} />
                </span>
                <span className="activity-title">{ACTIVITIES[k].title}</span>
                <span className="activity-text">{ACTIVITIES[k].text}</span>
              </a>
            ))}
          </div>
          <p className="tiny muted">These are optional suggestions.</p>
        </Card>
        {(saved.mood === 'overwhelmed' || saved.mood === 'lonely') && (
          <Card className="support-card">
            <h2 className="h3">You don’t have to handle everything alone <Emoji e="🤝" /></h2>
            <SupportInfo />
          </Card>
        )}
        <div className="btn-row center">
          <LinkButton to="/s/home">Return to Dashboard</LinkButton>
          <Button variant="ghost" onClick={() => navigate('/s/mood?tab=history')}>
            View Mood History
          </Button>
        </div>
      </div>
    );
  }

  if (existing && !editing) {
    const m = MOOD[existing.mood];
    return (
      <>
        <Card className="already tint-gradient" style={{ '--tint': m.soft }}>
          <div className="success-emoji">
            <MoodIcon mood={existing.mood} size={120} />
          </div>
          <h2>You’ve already checked in today.</h2>
          <p className="muted">You’re feeling {m.label.toLowerCase()}. You can update it anytime today.</p>
          <div className="btn-row center">
            <Button variant="secondary" onClick={() => setViewOpen(true)}>
              View Today’s Check-In
            </Button>
            <Button onClick={() => setEditing(true)}>Update Mood</Button>
          </div>
        </Card>
        <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Today’s Check-In">
          <MoodDetail entry={existing} />
        </Modal>
      </>
    );
  }

  return (
    <div className="checkin">
      <Card>
        <h2>How are you feeling today?</h2>
        <p className="muted">Take a moment to check in with yourself.</p>
        <fieldset className="mood-grid">
          <legend className="sr-only">Choose your mood</legend>
          {MOODS.map((m) => (
            <label key={m.key} className={`mood-card ${mood === m.key ? 'selected' : ''}`} style={{ '--mood': m.color, '--mood-soft': m.soft, '--mood-ink': m.ink }}>
              <input
                type="radio"
                name="mood"
                value={m.key}
                checked={mood === m.key}
                onChange={() => {
                  setMood(m.key);
                  setError('');
                }}
                className="sr-only"
              />
              <MoodIcon mood={m.key} size={96} className="mood-emoji" />
              <span className="mood-label">{m.label}</span>
              {mood === m.key && (
                <span className="mood-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </Card>

      {mood && (
        <Card className="reveal">
          <h2 className="h3">Would you like to tell us a little more?</h2>
          <p className="muted small">Everything below is optional. Share only what you’re comfortable with.</p>
          <TextField
            as="textarea"
            label="What’s on your mind today?"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a few words… (optional)"
            hint={`${note.length}/500 · Private to you`}
          />
          <fieldset className="factor-set">
            <legend>What may be affecting your mood today?</legend>
            <div className="chip-row">
              {FACTORS.map((f) => (
                <button key={f.key} type="button" className={`chip ${factors.includes(f.key) ? 'on' : ''}`} aria-pressed={factors.includes(f.key)} onClick={() => toggleFactor(f.key)}>
                  <span aria-hidden="true"><Emoji e={f.emoji} /></span> {f.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="btn-row">
            <Button size="lg" onClick={save} loading={saving}>
              {existing ? 'Update Today’s Mood' : 'Save Today’s Mood'}
            </Button>
            {existing && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function History({ user }) {
  const db = useDB();
  const [count, setCount] = useState(14);
  const entries = moodsOf(db, user.id);
  if (!entries.length) {
    return <EmptyState emoji="💚" title="No check-ins yet" message="Your mood history will appear here after your first check-in." action={<LinkButton to="/s/mood">Check in now</LinkButton>} />;
  }
  return (
    <Card>
      <h2>My Mood History</h2>
      <MoodTimeline entries={entries.slice(0, count)} />
      {count < entries.length && (
        <div className="center">
          <Button variant="secondary" onClick={() => setCount(count + 14)}>
            Show more
          </Button>
        </div>
      )}
    </Card>
  );
}

function CalendarTab({ user }) {
  const db = useDB();
  const moods = moodsOf(db, user.id);
  const [sel, setSel] = useState(null);
  return (
    <div className="grid-cal">
      <Card>
        <MoodCalendar moods={moods} selected={sel?.date} onSelect={(date, entry) => setSel({ date, entry })} />
      </Card>
      <Card aria-live="polite">
        {sel ? (
          <>
            <h2 className="h3">Check-in details</h2>
            {sel.entry ? <MoodDetail entry={sel.entry} /> : <p className="muted">No check-in on this day.</p>}
          </>
        ) : (
          <EmptyState emoji="🗓️" title="Pick a day" message="Select a day on the calendar to see your mood, note and mood factors." />
        )}
      </Card>
    </div>
  );
}
