# MindTrack — Guidance Mental Health Monitoring System

A guidance wellness app for SMCBI students and guidance counselors: daily mood check-ins, a wellness survey with automatic scoring and counselor-review flags, a Wellness Space (guided breathing, Bubble Wrap, daily challenges), a private journal with optional sharing, and online appointment scheduling. Students and counselors each get their own dashboard.

## How it's built

```
React app (browser)  ──fetch──▶  public/api/*.php (InfinityFree)  ──PDO──▶  MySQL
```

- **public/api/** is the PHP API. It handles sign-in (PHP sessions, bcrypt passwords), checks the user's role and ownership on every request, computes survey scores, wellness indicators and review flags, and sends notifications.
- The React app loads a snapshot of the data the signed-in user may see (`api/data.php`) and sends every change to `api/action.php`. Counselors never receive private journals or mood notes a student hasn't chosen to share. Students never receive counselors' session notes.
- **docs/schema.sql** creates the tables plus the starter content (the Wellness Check questions and daily challenges). There is no demo data.

## Deploy to InfinityFree

1. **Database:** in phpMyAdmin, open the MindTrack database → *Import* → choose `docs/schema.sql`. This drops and recreates the MindTrack tables.
2. **Settings:** copy `public/api/config.sample.php` to `public/api/config.php` and fill in the MySQL details from the InfinityFree panel, a random `APP_SECRET` and a `SETUP_KEY`. `config.php` is git-ignored; never commit or share it.
3. **Build:** `npm install`, then `npm run build`. The `dist/` folder now holds the app *and* the `api/` folder.
4. **Upload** everything inside `dist/` (including `api/.htaccess`) into `htdocs/` using the InfinityFree File Manager or FTP.
5. **Add counselors:** open `https://mindtrack.page.gd/api/setup.php`, then enter the setup key and the counselor's details. Do this before students start using the app so counselors receive review and journal notifications. When you're done, set `SETUP_KEY` to `''` in `config.php` and upload it again. The first counselor created is the **superadmin**; they add the other staff ("admins") from the Staff page in the app. Admins do everything a superadmin does except manage staff, edit Wellness Check questionnaires, name student officers and permanently delete students.
6. **Students** register themselves at `/#/register` with their `lastnamefirstname@smcbi.edu.ph` email.

### Email (verification and reset codes)

InfinityFree blocks PHP's `mail()`, so MindTrack sends codes over SMTP.

- `MAIL_MODE = 'show'` (testing): no email is sent; the code appears on screen in the *Test mode inbox*. Anyone could register any @smcbi.edu.ph address this way, so don't leave it on for real students.
- `MAIL_MODE = 'smtp'` (live): fill in the `SMTP_*` settings. With Gmail, turn on 2-Step Verification, create an *App password*, and use `smtp.gmail.com`, port `587`, `tls`. Brevo's free SMTP works the same way.

### Local development

`npm run dev` needs the PHP API running with a MySQL database. InfinityFree's database only accepts connections from InfinityFree itself, so install XAMPP, put `public/api` under `htdocs/mindtrack/api` with a `config.php` pointing at XAMPP's MySQL, import `docs/schema.sql`, and start Vite with `API_PROXY=http://localhost/mindtrack npm run dev`.

## Security summary

| | |
|---|---|
| Accounts | Only verified `@smcbi.edu.ph` addresses in `lastnamefirstname` format. Counselors are created by an admin and can't self-register |
| Passwords | PHP `password_hash` (bcrypt). One-time codes stored as HMAC hashes with a 10-minute expiry and a 5-attempt limit |
| Sessions | HttpOnly SameSite cookie; 30-minute idle timeout on the server and in the tab; 5-minute lockout after 5 failed sign-ins |
| Access | Role and ownership checked on every API call. Journals stay private unless shared. Counselor views of student profiles and shared journals are logged |

## Changing school settings

Everything school-specific is in [src/config.js](src/config.js): the school name, the email domain, the guidance office details, the **crisis hotlines** (please confirm these with the guidance office), the security limits, and the counselor-review thresholds.

## Wellness score & review flags

- **Wellness indicator (0–100)** combines the average of the last 14 days of mood check-ins (45%), the latest Wellness Check from the past 30 days (40%), and wellness activity participation over the past 7 days (15%). If a part is missing, the remaining weights are rebalanced. The indicator is labelled as self-reported and is never presented as a diagnosis.
- **Wellness Check**: 10 frequency questions scored 0–4 (negatively worded items are reverse-scored) and scaled to 0–100.
- **Counselor-review flags** are raised when any of these is true: the survey score is below 40, a critical item is answered "Often" or "Very often", or a student has 3 or more Sad/Overwhelmed check-ins within 7 days. Flags ask for a counselor's review; they are not diagnoses.

## Project structure

```
public/api/            PHP API: auth, data snapshot, actions, mailer, counselor setup page
docs/schema.sql        MySQL tables + starter survey questions and challenges
src/
  config.js            school settings, security limits, flag rules
  lib/                 API client (store), auth, scoring, actions, router
  components/          UI kit, charts, layout, shared widgets
  pages/auth/          landing, login, 3-step registration, password reset
  pages/student/       home, mood, progress, wellness space, breathing, bubble pop,
                       challenges, survey, journal, appointments, profile
  pages/counselor/     dashboard, students, student profile, mood overview, wellness,
                       needs review, appointments calendar, shared journals, activities, settings
```

## Credits

- Icons: MindTrack's kawaii icon set is in `src/assets/icons/`; `ICONS` in `src/lib/emoji.js` says which emoji each icon replaces.
- Emoji without a kawaii icon: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (3D style) by Microsoft, MIT licence. The images MindTrack uses are in `src/assets/emoji/`; add new ones there and list them in `src/lib/emoji.js`.
- Mood illustrations: `src/assets/moods/`, cut from `pictures/nicole.png`.
- Weather next to the clock: [Open-Meteo](https://open-meteo.com/) (free, no API key; CC BY 4.0). The location is `weatherLocation` in `src/config.js`.
