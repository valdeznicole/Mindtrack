import { todayISO, toISO } from './dates';

// One look per kind of notification, shared by the live pop-up cards and the Notifications page.
export const NOTIF_TYPES = {
  appointment: { label: 'Appointment', icon: '📅', accent: '#3f7f9a', soft: '#e1eef3' },
  flag: { label: 'Needs review', icon: '🚩', accent: '#b4233c', soft: '#fbe6ea' },
  journal: { label: 'Journal', icon: '📝', accent: '#9a6b12', soft: '#fbf1d9' },
  mood: { label: 'Daily mood', icon: '🌤️', accent: '#2e5e47', soft: '#e4f0e8' },
  student: { label: 'Students', icon: '👤', accent: '#5b4a8b', soft: '#eee8f4' },
  challenge: { label: 'Wellness', icon: '🌱', accent: '#2e5e47', soft: '#e4f0e8' },
  survey: { label: 'Wellness Check', icon: '📋', accent: '#5b4a8b', soft: '#eee8f4' },
  security: { label: 'Account security', icon: '🔑', accent: '#7a4706', soft: '#feebd1' },
  general: { label: 'Update', icon: '🔔', accent: '#2e5e47', soft: '#e4f0e8' },
};

// Kind from the stored value, or worked out from the link for older notifications saved as "general".
export function notifType(n) {
  let kind = n.kind && n.kind !== 'general' ? n.kind : null;
  const link = n.link || '';
  if (!kind) {
    if (link.includes('appointments')) kind = 'appointment';
    else if (link.includes('/c/review')) kind = 'flag';
    else if (link.includes('journal')) kind = 'journal';
    else if (link.includes('/s/mood')) kind = 'mood';
    else if (link.includes('/c/students')) kind = 'student';
    else if (link.includes('challenge')) kind = 'challenge';
  }
  const type = NOTIF_TYPES[kind] || NOTIF_TYPES.general;
  // Old notifications stored a green heart for everything; use the kind's icon instead.
  const icon = n.icon && n.icon !== '💚' ? n.icon : type.icon;
  return { ...type, kind: kind || 'general', icon };
}

// "Today" / "Yesterday" / "Earlier" buckets for the Notifications page.
export function notifGroup(ms) {
  const d = toISO(new Date(ms));
  const today = todayISO();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (d === today) return 'Today';
  if (d === toISO(y)) return 'Yesterday';
  return 'Earlier';
}
