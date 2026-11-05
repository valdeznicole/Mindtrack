import { useState } from 'react';
import { useDB } from '../../lib/store';
import { fmtDate } from '../../lib/dates';
import { surveyQuestions, isSuperadmin } from '../../lib/selectors';
import { SURVEY_OPTIONS } from '../../lib/scoring';
import { deleteQuestion, deleteSurvey, duplicateSurvey, moveQuestion, saveQuestion, saveSurvey, setActiveSurvey } from '../../lib/actions';
import { navigate } from '../../lib/router';
import { Alert, Button, Card, EmptyState, LinkButton, Modal, PageHeader, SectionTitle, SelectField, TextField, useFeedback } from '../../components/ui';

// Counselors create and edit the Wellness Check questionnaires students answer.
// Once students have answered a questionnaire its questions are locked (answers are stored in question order);
// "Duplicate" makes an editable new version.

const MIN_QUESTIONS = 3;
const SCORING = [
  { value: 'positive', label: 'Positive: answering “Very Often” is good for wellbeing' },
  { value: 'negative', label: 'Reverse-scored: answering “Very Often” signals a concern' },
];

const toDate = (ms) => new Date(ms).toISOString().slice(0, 10);

export default function SurveyManager({ params }) {
  return params?.id ? <SurveyEditor id={params.id} /> : <SurveyList />;
}

function SurveyList() {
  const db = useDB();
  const canEdit = isSuperadmin(db);
  const { toast, confirm } = useFeedback();
  const [creating, setCreating] = useState(false);
  const surveys = [...db.surveys].sort((a, b) => Number(b.active) - Number(a.active) || b.created_at - a.created_at);
  const active = surveys.find((s) => s.active);

  const turnOff = async () => {
    if (!(await confirm({ title: 'Turn off the Wellness Check?', message: 'Students won’t be able to take a Wellness Check until you make a questionnaire active again.', confirmLabel: 'Turn off', tone: 'danger' }))) return;
    await setActiveSurvey(null);
    toast('The Wellness Check is turned off.', 'info');
  };

  return (
    <>
      <PageHeader
        title="Wellness Check Questionnaires"
        subtitle="Create and edit the questions students answer in the Wellness Check. One questionnaire is active at a time."
        actions={canEdit && <Button onClick={() => setCreating(true)}>+ New questionnaire</Button>}
      />
      {!canEdit && <Alert tone="info">You can view the questionnaires. Only the superadmin can create, edit or switch them.</Alert>}
      {active ? (
        <Alert tone="success" title={`Students are answering “${active.title}”.`}>
          {surveyQuestions(db, active.id).length} questions · {active.responses} response{active.responses === 1 ? '' : 's'} so far.{' '}
          {canEdit && (
            <button type="button" className="text-link" onClick={turnOff}>
              Turn off the Wellness Check
            </button>
          )}
        </Alert>
      ) : (
        <Alert tone="warn" title="No questionnaire is active.">
          Students can’t take a Wellness Check right now. Open a questionnaire and make it active.
        </Alert>
      )}

      {surveys.length === 0 ? (
        <EmptyState emoji="📋" title="No questionnaires yet" message="Create one to get started." />
      ) : (
        <ul className="survey-list">
          {surveys.map((s) => {
            const count = surveyQuestions(db, s.id).length;
            return (
              <li key={s.id}>
                <a href={`#/c/wellness-check/${s.id}`} className="survey-row">
                  <div className="grow">
                    <div className="survey-row-top">
                      <strong>{s.title}</strong>
                      {s.active ? <span className="pill pill-green">● Active</span> : <span className="pill pill-gray">Draft</span>}
                      {s.responses > 0 && <span className="pill pill-blue">🔒 Locked</span>}
                    </div>
                    {s.description && <p className="muted small">{s.description}</p>}
                    <p className="tiny muted">
                      {count} question{count === 1 ? '' : 's'} · {s.responses} response{s.responses === 1 ? '' : 's'} · created {fmtDate(toDate(s.created_at), { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="survey-row-arrow" aria-hidden="true">
                    ›
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <SurveyDetailsModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function SurveyDetailsModal({ open, onClose, survey }) {
  const { toast } = useFeedback();
  const [f, setF] = useState({ title: survey?.title || '', description: survey?.description || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!f.title.trim()) return setError('Please give the questionnaire a title.');
    setSaving(true);
    try {
      const id = await saveSurvey({ id: survey?.id, title: f.title, description: f.description });
      toast(survey ? 'Details saved.' : 'Questionnaire created. Now add its questions.');
      onClose();
      if (!survey) navigate(`/c/wellness-check/${id}`);
    } catch {
      /* the error is shown as a toast */
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={survey ? 'Edit details' : 'New questionnaire'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {survey ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <TextField label="Title" value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} error={error} placeholder="e.g. Wellness Check (2nd semester)" />
        <TextField as="textarea" rows={3} label="Description shown to students (optional)" value={f.description} maxLength={500} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="A short self-reflection check-in. There are no right or wrong answers." />
      </div>
    </Modal>
  );
}

function SurveyEditor({ id }) {
  const db = useDB();
  const canEdit = isSuperadmin(db);
  const { toast, confirm } = useFeedback();
  const survey = db.surveys.find((s) => s.id === id);
  const questions = survey ? surveyQuestions(db, id) : [];
  const [editing, setEditing] = useState(null); // question object, or {} for a new one
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!survey) return <EmptyState emoji="🔍" title="Questionnaire not found" action={<LinkButton to="/c/wellness-check">Back to questionnaires</LinkButton>} />;
  const locked = survey.responses > 0;

  const makeActive = async () => {
    await setActiveSurvey(survey.id);
    toast('This questionnaire is now the Wellness Check students see.');
  };
  const duplicate = async () => {
    const newId = await duplicateSurvey(survey.id);
    toast('Copied. You can edit this new version.');
    navigate(`/c/wellness-check/${newId}`);
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this questionnaire?', message: `“${survey.title}” and its questions will be deleted.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    navigate('/c/wellness-check', { replace: true });
    await deleteSurvey(survey.id);
    toast('Questionnaire deleted.');
  };
  const removeQuestion = async (q) => {
    if (!(await confirm({ title: 'Delete this question?', message: q.question, confirmLabel: 'Delete', tone: 'danger' }))) return;
    await deleteQuestion(q.id);
    toast('Question deleted.');
  };

  return (
    <>
      <PageHeader
        back="/c/wellness-check"
        title={survey.title}
        subtitle={survey.description || 'No description yet.'}
        actions={
          canEdit && <>
            <Button variant="ghost" onClick={() => setDetailsOpen(true)}>
              Edit details
            </Button>
            {!survey.active && (
              <Button onClick={makeActive} disabled={questions.length < MIN_QUESTIONS}>
                Make active
              </Button>
            )}
          </>
        }
      />

      <div className="chip-row survey-status">
        {survey.active ? <span className="pill pill-green">● Active: students see this questionnaire</span> : <span className="pill pill-gray">Draft: students don’t see it yet</span>}
        <span className="pill">{survey.responses} response{survey.responses === 1 ? '' : 's'}</span>
      </div>

      {locked ? (
        <Alert tone="info" title="Questions are locked">
          Students have already answered this questionnaire, so its questions can’t change without mixing up their past results. Duplicate it to make an editable new version, then make that one active.
          {canEdit && (
            <div className="btn-row">
              <Button size="sm" onClick={duplicate}>
                Duplicate to edit
              </Button>
            </div>
          )}
        </Alert>
      ) : (
        !survey.active &&
        questions.length < MIN_QUESTIONS && <Alert tone="warn">Add at least {MIN_QUESTIONS} questions before making this questionnaire active.</Alert>
      )}

      <Card>
        <SectionTitle
          action={
            !locked && canEdit && (
              <Button size="sm" onClick={() => setEditing({})}>
                + Add question
              </Button>
            )
          }
        >
          Questions ({questions.length})
        </SectionTitle>
        <p className="muted small">Every question is answered on the same scale: {SURVEY_OPTIONS.join(' · ')}.</p>
        {questions.length === 0 ? (
          <EmptyState emoji="📝" title="No questions yet" message="Add the first question to build this questionnaire." />
        ) : (
          <ol className="question-list">
            {questions.map((q, i) => (
              <li key={q.id}>
                <span className="question-n">{i + 1}</span>
                <div className="grow">
                  <p className="question-text">{q.question}</p>
                  <div className="chip-row">
                    <span className={`pill ${q.scoring_rule === 'negative' ? 'pill-orange' : 'pill-green'}`}>{q.scoring_rule === 'negative' ? 'Reverse-scored' : 'Positive'}</span>
                    {q.area && <span className="pill pill-gray">{q.area}</span>}
                    {q.critical && <span className="pill pill-pink">🚩 Review flag</span>}
                  </div>
                </div>
                {!locked && canEdit && (
                  <div className="question-actions">
                    <button type="button" className="icon-btn" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => moveQuestion(q.id, 'up')}>
                      ↑
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Move question ${i + 1} down`} disabled={i === questions.length - 1} onClick={() => moveQuestion(q.id, 'down')}>
                      ↓
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Edit question ${i + 1}`} onClick={() => setEditing(q)}>
                      ✎
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Delete question ${i + 1}`} onClick={() => removeQuestion(q)}>
                      🗑️
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <SectionTitle>How scoring works</SectionTitle>
        <ul className="check-list small">
          <li>Each answer scores 0–4. Reverse-scored questions are flipped, so a higher total always means better wellbeing. The total is scaled to 0–100.</li>
          <li>A response is flagged for counselor review when the score is below 40, or when a question marked “Review flag” is answered Often or Very Often.</li>
          <li>The “area” label (e.g. Sleep &amp; rest) is shown to the student when that answer suggests extra support could help.</li>
        </ul>
      </Card>

      {canEdit && (
        <div className="btn-row">
          <Button variant="secondary" onClick={duplicate}>
            Duplicate
          </Button>
          {!survey.active && !locked && (
            <Button variant="danger-soft" onClick={remove}>
              Delete questionnaire
            </Button>
          )}
        </div>
      )}

      {editing && <QuestionModal key={editing.id || 'new'} surveyId={survey.id} question={editing} onClose={() => setEditing(null)} />}
      {detailsOpen && <SurveyDetailsModal open survey={survey} onClose={() => setDetailsOpen(false)} />}
    </>
  );
}

function QuestionModal({ surveyId, question, onClose }) {
  const { toast } = useFeedback();
  const isNew = !question.id;
  const [f, setF] = useState({
    question: question.question || '',
    scoring_rule: question.scoring_rule || 'positive',
    area: question.area || '',
    critical: !!question.critical,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!f.question.trim()) return setError('Please write the question.');
    setSaving(true);
    try {
      await saveQuestion({ id: question.id, surveyId, ...f });
      toast(isNew ? 'Question added.' : 'Question saved.');
      onClose();
    } catch {
      /* the error is shown as a toast */
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Add question' : 'Edit question'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {isNew ? 'Add question' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <TextField
          as="textarea"
          rows={3}
          label="Question"
          value={f.question}
          maxLength={255}
          onChange={(e) => setF({ ...f, question: e.target.value })}
          error={error}
          placeholder="How often have you been able to get enough restful sleep?"
          hint="Students answer: Never, Rarely, Sometimes, Often, Very Often. Phrase it as “How often…”."
        />
        <SelectField label="Scoring" value={f.scoring_rule} onChange={(e) => setF({ ...f, scoring_rule: e.target.value })} options={SCORING} />
        <TextField label="Area (optional)" value={f.area} maxLength={60} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="e.g. Sleep & rest" hint="Shown to the student as an area that could use support when they score low here." />
        <label className="check-label">
          <input type="checkbox" checked={f.critical} onChange={(e) => setF({ ...f, critical: e.target.checked })} /> Review flag: send this response to Needs Review when answered Often or Very Often
        </label>
      </div>
    </Modal>
  );
}
