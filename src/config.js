// School-specific settings. Change these values to adapt MindTrack to another school.
export const SCHOOL = {
  shortName: 'SMCBI',
  emailDomain: 'smcbi.edu.ph',
  guidanceOffice: {
    name: 'SMCBI Guidance Office',
    location: 'Guidance Office, Immaculate Conception Building',
    hours: 'Monday – Friday, 8:00 AM – 5:00 PM',
  },
  // Where the weather next to the clock is taken from (the school campus, not the student's location).
  weatherLocation: { name: 'Bansalan', lat: 6.7868, lon: 125.2131 },
  // Crisis / emergency lines. Each number is a tap-to-call link; `note` is shown under the number.
  crisisLines: [
    {
      label: 'NCMH Crisis Hotline (24/7)',
      numbers: [
        { label: 'Short code', value: '1553', note: 'Toll-free for Luzon landlines; standard rates apply for mobile networks' },
        { label: 'Toll-free landline', value: '1800-1888-1553' },
        { label: 'Globe / TM', value: '0917-899-8727', note: 'USAP' },
        { label: 'Globe / TM', value: '0966-351-4518' },
        { label: 'Smart / TNT / Sun', value: '0919-057-1553' },
        { label: 'Smart / TNT / Sun', value: '0908-639-2672' },
      ],
    },
    { label: 'National Emergency Hotline', numbers: [{ label: 'Emergency', value: '911' }] },
  ],
};

export const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

// Positions the superadmin can give a student officer. Keep in sync with OFFICER_POSITIONS in public/api/action.php.
export const OFFICER_POSITIONS = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Auditor', 'P.R.O.', 'Representative', 'Peer Facilitator'];

// School Student ID format: "C24" followed by 4 digits, e.g. C243061. Keep in sync with STUDENT_ID_PATTERN in
// public/api/lib.php (the server checks it too).
export const STUDENT_ID = {
  pattern: /^C24\d{4}$/,
  example: 'C243061',
  rule: 'C24 followed by 4 digits',
};
// Tidy what students type: capital C, no spaces or dashes (c24-3061 → C243061).
export const normalizeStudentId = (s) => s.toUpperCase().replace(/[\s-]/g, '');

export const SECURITY = {
  sessionIdleMinutes: 30,
  otpTtlMinutes: 10,
  otpMaxAttempts: 5,
  otpResendSeconds: 30,
  maxLoginAttempts: 5,
  lockoutMinutes: 5,
};

// School-approved counselor-review criteria. These trigger a review flag, never a diagnosis.
export const FLAG_RULES = {
  surveyScoreBelow: 40,
  criticalItemMinAnswer: 3, // "Often" or "Very Often" on a critical survey item
  lowMoodDaysInWeek: 3, // Sad, Lonely, Anxious or Overwhelmed check-ins within 7 days
};

export const RESTRICTED_MSG =
  'Access restricted. Please use your official SMCBI school email address to register or log in.';
