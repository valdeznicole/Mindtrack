import { useState } from 'react';
import { useDB } from '../../lib/store';
import { fmtDate } from '../../lib/dates';
import { MOOD } from '../../lib/moods';
import { EmptyState, LinkButton, PageHeader, Tabs, MoodIcon, Emoji, emojify } from '../../components/ui';

export default function Journal({ user }) {
  const db = useDB();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const all = db.journals.filter((j) => j.user_id === user.id).sort((a, b) => b.date.localeCompare(a.date) || b.created_at - a.created_at);
  const term = q.trim().toLowerCase();
  const list = all
    .filter((j) => (filter === 'all' ? true : filter === 'shared' ? j.is_shared : !j.is_shared))
    .filter((j) => !term || j.title.toLowerCase().includes(term) || j.content.toLowerCase().includes(term) || j.tags.some((t) => t.includes(term)));

  return (
    <>
      <PageHeader title="My Journal" subtitle="A private space for your thoughts." actions={<LinkButton to="/s/journal/new">+ New Entry</LinkButton>} />
      {all.length === 0 ? (
        <EmptyState emoji="📝" title="Your journal is empty" message="Writing down how you feel can help you understand it. Your entries are private unless you choose to share one." action={<LinkButton to="/s/journal/new">Write your first entry</LinkButton>} />
      ) : (
        <>
          <div className="toolbar">
            <Tabs
              label="Filter entries"
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: 'all', label: 'All', count: all.length },
                { value: 'private', label: '🔒 Private', count: all.filter((j) => !j.is_shared).length },
                { value: 'shared', label: '💬 Shared', count: all.filter((j) => j.is_shared).length },
              ]}
            />
            <label className="search">
              <span className="sr-only">Search journal</span>
              <span aria-hidden="true"><Emoji e="🔍" /></span>
              <input type="search" placeholder="Search entries" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>
          {list.length === 0 ? (
            <EmptyState emoji="🔍" title="No matching entries" message="Try a different search or filter." />
          ) : (
            <div className="journal-grid">
              {list.map((j) => {
                const m = MOOD[j.mood];
                return (
                  <a key={j.id} href={`#/s/journal/${j.id}`} className="journal-card" style={{ '--tint': m?.soft || '#F1F4F2', '--edge': m?.color || '#DDE3DF' }}>
                    <div className="journal-top">
                      <span className="journal-mood" aria-hidden="true">
                        {m ? <MoodIcon mood={m.key} size={36} /> : <Emoji e="📝" />}
                      </span>
                      <span className={`pill ${j.is_shared ? 'pill-blue' : 'pill-gray'}`}>{emojify(j.is_shared ? '💬 Shared' : '🔒 Private')}</span>
                    </div>
                    <h2>{j.title}</h2>
                    <p className="journal-date">
                      {fmtDate(j.date)}
                      {m && ` · ${m.label}`}
                    </p>
                    <p className="journal-preview">{j.content}</p>
                    {j.tags.length > 0 && (
                      <div className="chip-row">
                        {j.tags.slice(0, 3).map((t) => (
                          <span key={t} className="tag">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
