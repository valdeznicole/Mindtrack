import { addDays, todayISO } from './dates';

export const SURVEY_OPTIONS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'];

// "positive" items: Very Often scores highest. "negative" items are reverse-scored.
export const answerPoints = (q, idx) => (q.scoring_rule === 'positive' ? idx : 4 - idx);

export function scoreSurvey(questions, answers) {
  const total = questions.reduce((sum, q, i) => sum + answerPoints(q, answers[i]), 0);
  return Math.round((total / (questions.length * 4)) * 100);
}

// Friendly, non-clinical labels for the self-reported wellness indicator.
export function statusFor(score) {
  if (score == null) return { label: 'Not enough data yet', tone: 'okay' };
  if (score >= 80) return { label: 'Thriving', tone: 'very_good' };
  if (score >= 65) return { label: 'Good', tone: 'good' };
  if (score >= 50) return { label: 'Doing Okay', tone: 'okay' };
  if (score >= 35) return { label: 'Could use a boost', tone: 'stressed' };
  return { label: 'Extra support may help', tone: 'sad' };
}

// Wellness indicator = recent mood check-ins (14 days) + latest wellness check (30 days)
// + wellness activity participation (7 days). Weights are re-balanced when a part is missing.
export function computeWellness(db, userId, asOf = todayISO()) {
  const from14 = addDays(asOf, -13);
  const moods = db.moods.filter((m) => m.user_id === userId && m.date >= from14 && m.date <= asOf);
  const moodScore = moods.length ? moods.reduce((s, m) => s + ((m.mood_value - 1) / 4) * 100, 0) / moods.length : null;

  const from30 = addDays(asOf, -30);
  const survey = db.surveyResponses
    .filter((r) => r.user_id === userId && r.date >= from30 && r.date <= asOf)
    .sort((a, b) => b.submitted_at - a.submitted_at)[0];
  const surveyScore = survey ? survey.score : null;

  const from7 = addDays(asOf, -6);
  const acts = db.activities.filter((a) => a.user_id === userId && a.date >= from7 && a.date <= asOf).length;
  const activityScore = (Math.min(acts, 5) / 5) * 100;

  if (moodScore == null && surveyScore == null) return null;
  const parts = [
    [moodScore, 0.45],
    [surveyScore, 0.4],
    [activityScore, 0.15],
  ].filter(([v]) => v != null);
  const weight = parts.reduce((s, [, w]) => s + w, 0);
  const score = Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / weight);
  return { score, status: statusFor(score).label, moodScore, surveyScore, activityScore };
}
