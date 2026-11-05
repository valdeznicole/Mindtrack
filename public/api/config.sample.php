<?php
// Copy this file to config.php and fill in your values. config.php is git-ignored: never commit real passwords.

// MySQL (InfinityFree panel → MySQL Databases)
const DB_HOST = 'sql305.infinityfree.com';
const DB_PORT = 3306;
const DB_NAME = 'if0_XXXXXXXX_Mindtrack';
const DB_USER = 'if0_XXXXXXXX';
const DB_PASS = 'your-mysql-password';

const APP_URL = 'https://mindtrack.page.gd';
const APP_TIMEZONE = 'Asia/Manila';
const APP_DEBUG = false;                 // true shows raw PHP errors in API responses; keep false when live
const APP_SECRET = 'change-me-to-a-long-random-string';   // used to hash one-time codes

const SCHOOL_EMAIL_DOMAIN = 'smcbi.edu.ph';

// Email delivery for verification / reset codes.
//  'smtp' = send real emails with the SMTP settings below (Gmail app password, Brevo, etc.)
//  'show' = TESTING ONLY: no email is sent, the code is shown on screen. Anyone could then register
//           with any @smcbi.edu.ph address, so switch to 'smtp' before real students use the app.
const MAIL_MODE = 'show';
const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 587;
const SMTP_SECURE = 'tls';               // 'tls' (STARTTLS, port 587) or 'ssl' (port 465)
const SMTP_USER = 'your.account@gmail.com';
const SMTP_PASS = 'your-16-char-app-password';
const SMTP_FROM = 'your.account@gmail.com';
const SMTP_FROM_NAME = 'MindTrack · SMCBI Guidance';

// One-time key for api/setup.php (creating counselor accounts). Set it to '' when you're done.
const SETUP_KEY = 'change-me';
