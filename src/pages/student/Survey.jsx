import { useRef, useState } from 'react';
import { useDB } from '../../lib/store';
import { activeSurvey, surveyQuestions } from '../../lib/selectors';
import { submitSurvey } from '../../lib/actions';
import { SURVEY_OPTIONS } from '../../lib/scoring';
import { navigate } from '../../lib/router';
import { Button, Card, EmptyState, PageHeader, Spinner, useFeedback, Emoji } from '../../components/ui';

export default function Survey({ user }) {
  const db = useDB();
  const { confirm } = useFeedback();
  const survey = activeSurvey(db);
  const questions = survey ? surveyQuestions(db, survey.id) : [];
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState([]);
  const [dir, setDir] = useState('next');
  const [submitting, setSubmitting] = useState(false);
  const viaPointer = useRef(false);

  if (!survey || !questions.length) {
    return <EmptyState emoji="📋" title="No wellness check available" message="Please check back later." />;
  }

  const q = questions[step];
  const choose = (i) => {
    const next = [...answers];
    next[step] = i;
    setAnswers(next);
    // Auto-advance for taps/clicks only; keyboard users move on with Next so arrow keys don't skip questions.
    const tapped = viaPointer.current;
    viaPointer.current = false;
    if (tapped && step < questions.length - 1) {
      setTimeout(() => {
        setDir('next');
        setStep(step + 1);
      }, 280);
    }
  };

  const back = () => {
    setDir('back');
    setStep(step - 1);
  };

  const exit = async () => {
    if (answers.length === 0 || (await confirm({ title: 'Leave the Wellness Check?', message: 'Your answers so far won’t be saved.', confirmLabel: 'Leave' }))) navigate('/s/wellness');
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const id = await submitSurvey(user.id, survey.id, answers);
      navigate(`/s/survey/result/${id}`);
    } catch {
      setSubmitting(false); // the error is shown as a toast; answers are kept so the student can retry
    }
  };

  if (submitting) {
    return (
      <Card className="center survey-submitting">
        <Spinner label="Saving your responses" />
        <p>Saving your responses…</p>
      </Card>
    );
  }

  if (step === -1) {
    return (
      <>
        <PageHeader back="/s/wellness" title="Wellness Check" subtitle="Answer honestly. There are no right or wrong answers." />
        <Card className="survey-intro">
          <div className="survey-intro-emoji" aria-hidden="true">
            <Emoji e="📋" />
          </div>
          <h2>{survey.title}</h2>
          <p className="muted">{survey.description}</p>
          <ul className="check-list">
            <li><Emoji e="⏱️" /> About {Math.max(1, Math.round((questions.length * 12) / 60))} minute{Math.round((questions.length * 12) / 60) > 1 ? 's' : ''} · {questions.length} questions</li>
            <li><Emoji e="🔒" /> Your answers are private and used for your wellness indicator</li>
            <li><Emoji e="💚" /> This is a reflection tool, not a test or diagnosis</li>
          </ul>
          <Button size="lg" onClick={() => setStep(0)}>
            Begin
          </Button>
        </Card>
      </>
    );
  }

  const last = step === questions.length - 1;
  return (
    <div className="survey">
      <div className="survey-top">
        <button className="text-link" onClick={exit}>
          ✕ Exit
        </button>
        <span className="muted" aria-live="polite">
          Question {step + 1} of {questions.length}
        </span>
      </div>
      <div className="progress-line big" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={step + 1} aria-label="Survey progress">
        <span style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
      </div>

      <Card className={`survey-card slide-${dir}`} key={step}>
        <fieldset>
          <legend>
            <h1 className="survey-q">{q.question}</h1>
          </legend>
          <div className="answer-list">
            {SURVEY_OPTIONS.map((opt, i) => (
              <label key={opt} className={`answer ${answers[step] === i ? 'selected' : ''}`} onPointerDown={() => (viaPointer.current = true)}>
                <input type="radio" name={`q${step}`} className="sr-only" checked={answers[step] === i} onChange={() => choose(i)} />
                <span className="answer-dot" aria-hidden="true" />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <div className="survey-nav">
        <Button variant="ghost" onClick={back} disabled={step === 0}>
          ← Back
        </Button>
        {last ? (
          <Button size="lg" onClick={submit} disabled={answers[step] == null}>
            Submit
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              setDir('next');
              setStep(step + 1);
            }}
            disabled={answers[step] == null}
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}
