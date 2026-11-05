import { useEffect, useState } from 'react';
import { useDB } from '../../lib/store';
import { byId, fullName } from '../../lib/selectors';
import { fmtDate, fmtDateTime } from '../../lib/dates';
import { MOOD } from '../../lib/moods';
import { logAccess } from '../../lib/actions';
import { navigate } from '../../lib/router';
import { Button, EmptyState, LinkButton, Modal, MoodBadge, PageHeader, MoodIcon } from '../../components/ui';

export default function SharedJournals({ user, query }) {
  const db = useDB();
  // Only entries the student explicitly shared are ever listed here.
  const list = db.journals.filter((j) => j.is_shared).sort((a, b) => (b.shared_at || 0) - (a.shared_at || 0));
  const [openId, setOpenId] = useState(() => (query.open && list.some((j) => j.id === query.open) ? query.open : null));
  const open = list.find((j) => j.id === openId);

  useEffect(() => {
    if (openId && openId === query.open) logAccess('shared_journal_viewed', openId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const view = (j) => {
    logAccess('shared_journal_viewed', j.id);
    setOpenId(j.id);
  };

  return (
    <>
      <PageHeader title="Journal Entries Shared With You" subtitle="Students chose to share these entries. Please treat them with care and confidentiality." />
      {list.length === 0 ? (
        <EmptyState emoji="📝" title="No shared entries" message="When a student shares a journal entry, it will appear here." />
      ) : (
        <div className="journal-grid">
          {list.map((j) => {
            const s = byId(db, j.user_id);
            const m = MOOD[j.mood];
            return (
              <article key={j.id} className="journal-card static" style={{ '--tint': m?.soft || '#F1F4F2', '--edge': m?.color || '#DDE3DF' }}>
                <div className="journal-top">
                  <span>
                    <strong>{fullName(s)}</strong>
                    <span className="muted small"> · #{s.student_id}</span>
                  </span>
                  {m && <MoodIcon mood={m.key} size={28} label />}
                </div>
                <h2>{j.title}</h2>
                <p className="journal-date">
                  {fmtDate(j.date)}
                  {m && ` · ${m.label}`}
                </p>
                <p className="journal-preview">{j.content}</p>
                <Button size="sm" variant="secondary" onClick={() => view(j)}>
                  View Entry
                </Button>
              </article>
            );
          })}
        </div>
      )}
      <Modal
        open={!!open}
        onClose={() => {
          setOpenId(null);
          if (query.open) navigate('/c/journals', { replace: true });
        }}
        title={open?.title}
        size="modal-lg"
        footer={open && <LinkButton to={`/c/students/${open.user_id}`} variant="secondary">View student profile</LinkButton>}
      >
        {open && (
          <>
            <p className="muted small">
              {fullName(byId(db, open.user_id))} · {fmtDate(open.date)} · Shared {fmtDateTime(open.shared_at || open.updated_at)}
            </p>
            {open.mood && <MoodBadge mood={open.mood} />}
            <div className="journal-body">{open.content}</div>
          </>
        )}
      </Modal>
    </>
  );
}
