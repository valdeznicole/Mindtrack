import { useState } from 'react';
import { useDB } from '../../lib/store';
import { students, archivedStudents, fullName } from '../../lib/selectors';
import { latestScore } from '../../lib/analytics';
import { statusFor } from '../../lib/scoring';
import { relDay } from '../../lib/dates';
import { MOOD } from '../../lib/moods';
import { YEAR_LEVELS } from '../../config';
import { Avatar, Button, EmptyState, PageHeader, Segmented, MoodIcon, Emoji } from '../../components/ui';
import { StudentFormModal } from './StudentAdmin';

export default function Students() {
  const db = useDB();
  const [q, setQ] = useState('');
  const [year, setYear] = useState('all');
  const [only, setOnly] = useState('all');
  const [view, setView] = useState('active');
  const [adding, setAdding] = useState(false);
  const archived = archivedStudents(db);
  const openFlags = new Set(db.flags.filter((f) => f.status !== 'reviewed').map((f) => f.user_id));
  const term = q.trim().toLowerCase();

  const list = (view === 'archived' ? archived : students(db))
    .filter((s) => year === 'all' || s.grade_level === year)
    .filter((s) => view === 'archived' || only === 'all' || openFlags.has(s.id))
    .filter((s) => !term || fullName(s).toLowerCase().includes(term) || s.student_id.includes(term) || s.section.toLowerCase().includes(term))
    .sort((a, b) => Number(openFlags.has(b.id)) - Number(openFlags.has(a.id)) || a.last_name.localeCompare(b.last_name));

  return (
    <>
      <PageHeader title="Students" subtitle="Authorized wellness information for SMCBI students." actions={<Button onClick={() => setAdding(true)}>+ Add student</Button>} />
      <Segmented
        label="Student accounts"
        value={view}
        onChange={setView}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'archived', label: `Archived (${archived.length})` },
        ]}
      />
      <div className="toolbar wrap">
        <label className="search grow">
          <span className="sr-only">Search students</span>
          <span aria-hidden="true"><Emoji e="🔍" /></span>
          <input type="search" placeholder="Search by name, Student ID or section" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="select-inline">
          <span className="sr-only">Year level</span>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">All year levels</option>
            {YEAR_LEVELS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        {view === 'active' && (
        <Segmented
          label="Filter"
          value={only}
          onChange={setOnly}
          options={[
            { value: 'all', label: 'All' },
            { value: 'flagged', label: '🚩 Needs review' },
          ]}
        />
        )}
      </div>
      <p className="muted small">{list.length} student{list.length === 1 ? '' : 's'}</p>
      {list.length === 0 ? (
        <EmptyState emoji="🔍" title={view === 'archived' ? 'No archived students' : 'No students found'} message={view === 'archived' ? 'Archived students appear here. Their history is kept and they can be restored anytime.' : 'Try a different search or filter.'} />
      ) : (
        <div className="student-grid">
          {list.map((s) => {
            const ws = latestScore(db, s.id);
            const st = ws ? statusFor(ws.score) : null;
            const last = db.moods.filter((m) => m.user_id === s.id).sort((a, b) => b.date.localeCompare(a.date))[0];
            return (
              <a key={s.id} href={`#/c/students/${s.id}`} className={`student-card ${s.archived ? 'is-archived' : ''}`}>
                <div className="student-top">
                  <Avatar user={s} size={44} />
                  <div>
                    <strong>{fullName(s)}</strong>
                    <span className="muted small">
                      #{s.student_id} · {s.section}
                    </span>
                  </div>
                  {s.officer_position && !s.archived && <span className="pill pill-lavender officer-pill" title="Officer">{s.officer_position}</span>}
                  {s.archived && <span className="pill pill-gray">Archived</span>}
                  {!s.archived && openFlags.has(s.id) && (
                    <span className="pill pill-pink" title="Needs review">
                      <Emoji e="🚩" /><span className="sr-only">Needs review</span>
                    </span>
                  )}
                </div>
                <div className="student-bottom">
                  <span className="score-chip" style={st ? { background: MOOD[st.tone].soft, color: MOOD[st.tone].ink } : undefined}>
                    {ws ? ws.score : '—'}
                  </span>
                  <span className="small">
                    <strong>{st ? st.label : 'No data yet'}</strong>
                    <span className="muted last-checkin">Last check-in: {last ? (<><MoodIcon mood={last.mood} size={20} label /> {relDay(last.date)}</>) : '—'}</span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
      {adding && <StudentFormModal onClose={() => setAdding(false)} />}
    </>
  );
}
