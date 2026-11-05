import veryGoodImg from '../assets/moods/very_good.webp';
import veryGoodFace from '../assets/moods/very_good-face.webp';
import goodImg from '../assets/moods/good.webp';
import goodFace from '../assets/moods/good-face.webp';
import okayImg from '../assets/moods/okay.webp';
import okayFace from '../assets/moods/okay-face.webp';
import stressedImg from '../assets/moods/stressed.webp';
import stressedFace from '../assets/moods/stressed-face.webp';
import sadImg from '../assets/moods/sad.webp';
import sadFace from '../assets/moods/sad-face.webp';
import overwhelmedImg from '../assets/moods/overwhelmed.webp';
import overwhelmedFace from '../assets/moods/overwhelmed-face.webp';
import excitedImg from '../assets/moods/excited.webp';
import excitedFace from '../assets/moods/excited-face.webp';
import calmImg from '../assets/moods/calm.webp';
import calmFace from '../assets/moods/calm-face.webp';
import tiredImg from '../assets/moods/tired.webp';
import tiredFace from '../assets/moods/tired-face.webp';
import anxiousImg from '../assets/moods/anxious.webp';
import anxiousFace from '../assets/moods/anxious-face.webp';
import angryImg from '../assets/moods/angry.webp';
import angryFace from '../assets/moods/angry-face.webp';
import lonelyImg from '../assets/moods/lonely.webp';
import lonelyFace from '../assets/moods/lonely-face.webp';

// `value` (1 to 5) feeds the mood charts and the wellness score; keep it in sync with MOOD_VALUES in
// public/api/lib.php. `low` moods count toward the counselor review flag (LOW_MOODS in lib.php).
// Each mood has an illustrated portrait (`img`, for large sizes) and a close-up of the face (`face`, for small
// sizes). Colours are taken from the illustrations' backgrounds so the art and the charts match.
export const MOODS = [
  { key: 'very_good', label: 'Very Good', value: 5, img: veryGoodImg, face: veryGoodFace, color: '#BCDFCA', soft: '#E9F5EE', ink: '#245A3E' },
  { key: 'good', label: 'Good', value: 4, img: goodImg, face: goodFace, color: '#8BBDFA', soft: '#E3EFFE', ink: '#1D4F8C' },
  { key: 'okay', label: 'Okay', value: 3, img: okayImg, face: okayFace, color: '#FBCE72', soft: '#FEF3DC', ink: '#6A4E0C' },
  { key: 'stressed', label: 'Stressed', value: 2, img: stressedImg, face: stressedFace, color: '#FCA37A', soft: '#FEE8DE', ink: '#8A3712' },
  { key: 'sad', label: 'Sad', value: 2, img: sadImg, face: sadFace, color: '#BFA6F7', soft: '#EFE9FD', ink: '#4A3596' },
  { key: 'overwhelmed', label: 'Overwhelmed', value: 1, img: overwhelmedImg, face: overwhelmedFace, color: '#FCA5C9', soft: '#FEE9F2', ink: '#8C1D4C' },
  { key: 'excited', label: 'Excited', value: 5, img: excitedImg, face: excitedFace, color: '#F9BBC0', soft: '#FCE4E8', ink: '#9E1127' },
  { key: 'calm', label: 'Calm', value: 4, img: calmImg, face: calmFace, color: '#B7E6D3', soft: '#E8F4EC', ink: '#03593C' },
  { key: 'tired', label: 'Tired', value: 3, img: tiredImg, face: tiredFace, color: '#B6BFEE', soft: '#E6EAFD', ink: '#303371' },
  { key: 'anxious', label: 'Anxious', value: 2, img: anxiousImg, face: anxiousFace, color: '#F7B4E6', soft: '#FCE7FA', ink: '#580685' },
  { key: 'angry', label: 'Angry', value: 2, img: angryImg, face: angryFace, color: '#FEA8A5', soft: '#FDE1DF', ink: '#8C1C08' },
  { key: 'lonely', label: 'Lonely', value: 2, img: lonelyImg, face: lonelyFace, color: '#ACCCF8', soft: '#E6EFF9', ink: '#213E82' },
];

// Check-ins with these moods count toward the "low-mood days in a week" review flag.
export const LOW_MOODS = ['sad', 'lonely', 'anxious', 'overwhelmed'];

export const MOOD = Object.fromEntries(MOODS.map((m) => [m.key, m]));

export const FACTORS = [
  { key: 'school', label: 'School', emoji: '📚' },
  { key: 'family', label: 'Family', emoji: '🏠' },
  { key: 'friends', label: 'Friends', emoji: '👥' },
  { key: 'sleep', label: 'Sleep', emoji: '😴' },
  { key: 'responsibilities', label: 'Responsibilities', emoji: '💼' },
  { key: 'relationships', label: 'Relationships', emoji: '❤️' },
  { key: 'financial', label: 'Financial concerns', emoji: '💰' },
  { key: 'growth', label: 'Personal growth', emoji: '🌱' },
  { key: 'other', label: 'Something else', emoji: '✨' },
];

export const FACTOR = Object.fromEntries(FACTORS.map((f) => [f.key, f]));

export const ACTIVITIES = {
  breathe: { to: '/s/breathe', emoji: '🫁', title: 'Guided Breathing', text: 'Take a calming breathing break.', color: 'var(--blue)' },
  bubbles: { to: '/s/bubbles', emoji: '🫧', title: 'Bubble Wrap', text: 'Pop some bubble wrap for a quick break.', color: 'var(--lavender)' },
  journal: { to: '/s/journal/new', emoji: '📝', title: 'Journal', text: 'Write down how you’re feeling.', color: 'var(--cream)' },
  survey: { to: '/s/survey', emoji: '📋', title: 'Wellness Check', text: 'Check in with yourself.', color: 'var(--sage)' },
  appointment: { to: '/s/appointments/book', emoji: '📅', title: 'Counseling Session', text: 'Talk to a counselor.', color: 'var(--pink)' },
  challenge: { to: '/s/challenges', emoji: '🌱', title: 'Daily Challenge', text: 'A small step for today.', color: 'var(--orange)' },
};

export function recommendationsFor(moodKey) {
  switch (moodKey) {
    case 'stressed':
    case 'overwhelmed':
      return { message: 'Want to take a short break?', items: ['breathe', 'bubbles', 'journal', 'appointment'] };
    case 'anxious':
      return { message: 'Let’s slow things down. One breath at a time.', items: ['breathe', 'bubbles', 'journal', 'appointment'] };
    case 'angry':
      return { message: 'It’s okay to feel this way. Take a moment to cool down.', items: ['breathe', 'bubbles', 'journal'] };
    case 'sad':
      return { message: 'It’s okay to take things one step at a time.', items: ['breathe', 'journal', 'appointment'] };
    case 'lonely':
      return { message: 'You’re not alone. Reaching out can help.', items: ['appointment', 'journal', 'breathe'] };
    case 'tired':
      return { message: 'Rest counts too. Be gentle with yourself today.', items: ['breathe', 'challenge', 'journal'] };
    case 'okay':
      return { message: 'A small pause can go a long way.', items: ['breathe', 'challenge', 'journal'] };
    case 'calm':
      return { message: 'That sounds peaceful. Enjoy the calm.', items: ['journal', 'challenge', 'breathe'] };
    default:
      return { message: 'That’s great! Keep taking care of yourself.', items: ['challenge', 'bubbles', 'journal'] };
  }
}
