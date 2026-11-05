<?php
// Shared helpers for the MindTrack API: database, sessions, access control, scoring and the per-role data snapshot.
declare(strict_types=1);

require __DIR__ . '/config.php';

date_default_timezone_set(APP_TIMEZONE);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const SECURITY = [
    'session_idle_minutes' => 30,
    'otp_ttl_minutes' => 10,
    'otp_max_attempts' => 5,
    'otp_resend_seconds' => 30,
    'max_login_attempts' => 5,
    'lockout_minutes' => 5,
];

const FLAG_RULES = [
    'survey_score_below' => 40,
    'critical_item_min_answer' => 3,
    'low_mood_days_in_week' => 3,
];

// School Student ID: "C24" followed by 4 digits, e.g. C243061 (keep in sync with STUDENT_ID in src/config.js).
const STUDENT_ID_PATTERN = '/^C24\d{4}$/';

// Keep in sync with MOODS in src/lib/moods.js.
const MOOD_VALUES = [
    'very_good' => 5, 'good' => 4, 'okay' => 3, 'stressed' => 2, 'sad' => 2, 'overwhelmed' => 1,
    'excited' => 5, 'calm' => 4, 'tired' => 3, 'anxious' => 2, 'angry' => 2, 'lonely' => 2,
];
// Check-ins with these moods count toward the "low-mood days in a week" review flag.
const LOW_MOODS = ['sad', 'lonely', 'anxious', 'overwhelmed'];
const FACTOR_KEYS = ['school', 'family', 'friends', 'sleep', 'responsibilities', 'relationships', 'financial', 'growth', 'other'];
const RESTRICTED_MSG = 'Access restricted. Please use your official SMCBI school email address to register or log in.';

// ---------- Output ----------
function respond(array $data, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $error, int $code = 400, array $extra = []): never
{
    respond(['ok' => false, 'error' => $error] + $extra, $code);
}

function input(): array
{
    // Custom header blocks cross-site form posts (a simple CSRF guard alongside SameSite cookies).
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'MindTrack') {
        fail('Bad request.', 400);
    }
    $data = json_decode(file_get_contents('php://input') ?: '[]', true);
    return is_array($data) ? $data : [];
}

set_exception_handler(function (Throwable $e) {
    error_log('MindTrack API: ' . $e);
    respond(['ok' => false, 'error' => APP_DEBUG ? $e->getMessage() : 'Something went wrong on our side. Please try again.'], 500);
});

// ---------- Database ----------
function db(): PDO
{
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false],
        );
        $pdo->exec("SET time_zone = '" . date('P') . "'");
    }
    return $pdo;
}

function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

function rows(string $sql, array $params = []): array
{
    return q($sql, $params)->fetchAll();
}

function row(string $sql, array $params = []): ?array
{
    return q($sql, $params)->fetch() ?: null;
}

function val(string $sql, array $params = []): mixed
{
    $v = q($sql, $params)->fetchColumn();
    return $v === false ? null : $v;
}

function uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

function today(): string
{
    return date('Y-m-d');
}

function add_days(string $date, int $n): string
{
    return date('Y-m-d', strtotime("$date $n day"));
}

function is_date(mixed $s): bool
{
    return is_string($s) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) && checkdate((int) substr($s, 5, 2), (int) substr($s, 8, 2), (int) substr($s, 0, 4));
}

function is_time(mixed $s): bool
{
    return is_string($s) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $s);
}

function str(mixed $v, int $max): string
{
    return mb_substr(trim(is_string($v) ? $v : ''), 0, $max);
}

// ---------- Live updates ----------
// A tiny "something changed" marker kept in a file, so open pages can poll api/changes.php cheaply (no
// database or session work) and reload their data only when it moves.
const VERSION_FILE = __DIR__ . '/data/version';

function bump_version(): string
{
    if (!is_dir(dirname(VERSION_FILE))) @mkdir(dirname(VERSION_FILE), 0755, true);
    $v = sprintf('%.4f', microtime(true));
    @file_put_contents(VERSION_FILE, $v, LOCK_EX);
    return $v;
}

// ---------- Sessions ----------
function start_session(): void
{
    $https = ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    session_name('mt_sid');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

// One device per account. The signed-in device holds the account's session token and checks in every minute
// (see the heartbeat in src/App.jsx). While it keeps checking in, a login from another device is refused; once
// it has been silent for SESSION_ALIVE_SECONDS (closed tab, phone asleep) another device may sign in, and the
// first one is signed out when it comes back.
const SESSION_ALIVE_SECONDS = 150;

function claim_session(string $userId): void
{
    $_SESSION['tok'] = bin2hex(random_bytes(16));
    q('UPDATE users SET session_token = ?, session_seen_at = ? WHERE id = ?', [$_SESSION['tok'], now(), $userId]);
}

// True when a different device is signed in to this account and still checking in.
function session_in_use(array $u): bool
{
    return !empty($u['session_token']) && !empty($u['session_seen_at'])
        && !hash_equals($u['session_token'], (string) ($_SESSION['tok'] ?? ''))
        && time() - strtotime($u['session_seen_at']) < SESSION_ALIVE_SECONDS;
}

function sign_in(string $userId): void
{
    session_regenerate_id(true);
    $_SESSION['uid'] = $userId;
    $_SESSION['last'] = time();
    claim_session($userId);
}

function sign_out(): void
{
    // Free the account for other devices, unless another device has already taken it over.
    if (!empty($_SESSION['uid']) && !empty($_SESSION['tok'])) {
        q('UPDATE users SET session_token = NULL, session_seen_at = NULL WHERE id = ? AND session_token = ?', [$_SESSION['uid'], $_SESSION['tok']]);
    }
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
}

function current_user(): ?array
{
    if (empty($_SESSION['uid'])) return null;
    if (time() - ($_SESSION['last'] ?? 0) > SECURITY['session_idle_minutes'] * 60) {
        log_event('session_timeout', $_SESSION['uid']);
        sign_out();
        return null;
    }
    $_SESSION['last'] = time();
    $u = row('SELECT * FROM users WHERE id = ?', [$_SESSION['uid']]);
    // Archived or deleted accounts are signed out on their next request, and told why.
    if (!$u || !empty($u['archived_at'])) {
        $GLOBALS['session_end_reason'] = $u ? 'archived' : 'deleted';
        sign_out();
        return null;
    }
    $tok = $_SESSION['tok'] ?? null;
    if ($u['session_token'] === null && $tok === null) {
        claim_session($u['id']); // a session from before one-device sign-in existed
    } elseif ($u['session_token'] === null || $tok === null || !hash_equals($u['session_token'], $tok)) {
        // Another device signed in to this account (or the password was reset): this one is signed out.
        $GLOBALS['session_end_reason'] = 'replaced';
        sign_out();
        return null;
    } elseif (empty($u['session_seen_at']) || time() - strtotime($u['session_seen_at']) > 20) {
        q('UPDATE users SET session_seen_at = ? WHERE id = ?', [now(), $u['id']]);
    }
    return $u;
}

const ARCHIVED_MSG = 'This account has been archived. Please contact the SMCBI Guidance Office if you need access again.';
const REPLACED_MSG = 'You were signed out because this account was signed in on another device.';
const IN_USE_MSG = 'This account is already in use on another device. Log out there first, then try again. If that device was just closed, wait a few minutes.';
const DELETED_MSG = 'This account was removed by the SMCBI Guidance Office. You can create a new account with your school email, or contact the guidance office if you think this is a mistake.';

function require_user(?string $role = null): array
{
    $u = current_user();
    if (!$u) {
        $why = $GLOBALS['session_end_reason'] ?? null;
        $msg = ['archived' => ARCHIVED_MSG, 'deleted' => DELETED_MSG, 'replaced' => REPLACED_MSG][$why] ?? 'Your session has ended. Please log in again.';
        fail($msg, 401, $why ? ['reason' => $why] : []);
    }
    if ($role && $u['role'] !== $role) fail('You don’t have access to this.', 403);
    return $u;
}

// ---------- School email & password rules (mirrors src/lib/auth.js) ----------
function slug_name(string $s): string
{
    $s = mb_strtolower($s);
    $s = strtr($s, ['á' => 'a', 'à' => 'a', 'â' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i', 'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'ö' => 'o', 'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ñ' => 'n']);
    return preg_replace('/[^a-z]/', '', $s);
}

function check_school_email(mixed $raw): array
{
    $email = strtolower(trim(is_string($raw) ? $raw : ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) return ['ok' => false, 'error' => 'Please enter a valid email address.'];
    [$local, $domain] = explode('@', $email, 2);
    if ($domain !== SCHOOL_EMAIL_DOMAIN) return ['ok' => false, 'restricted' => true, 'error' => RESTRICTED_MSG];
    if (!preg_match('/^[a-z]{2,}$/', $local)) return ['ok' => false, 'error' => 'Use the format lastnamefirstname@' . SCHOOL_EMAIL_DOMAIN];
    return ['ok' => true, 'email' => $email];
}

function check_password(mixed $pw): ?string
{
    if (!is_string($pw) || strlen($pw) < 8) return 'Use at least 8 characters.';
    if (!preg_match('/[A-Za-z]/', $pw) || !preg_match('/\d/', $pw)) return 'Include at least one letter and one number.';
    if (strlen($pw) > 200) return 'That password is too long.';
    return null;
}

// ---------- Security log & notifications ----------
function log_event(string $type, ?string $userId, string $detail = ''): void
{
    q('INSERT INTO security_events (user_id, event_type, detail, ip_address, created_at) VALUES (?, ?, ?, ?, ?)', [
        $userId, $type, mb_substr($detail, 0, 255), $_SERVER['REMOTE_ADDR'] ?? null, now(),
    ]);
}

function notify(string $userId, string $title, string $message, string $icon = '🔔', string $link = '', string $kind = 'general'): void
{
    q('INSERT INTO notifications (id, user_id, title, message, icon, link, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
        uuid(), $userId, $title, $message, $icon, $link, $kind, now(),
    ]);
}

function notify_counselors(string $title, string $message, string $icon, string $link, string $kind = 'general'): void
{
    foreach (rows("SELECT id FROM users WHERE role = 'counselor' AND archived_at IS NULL") as $c) notify($c['id'], $title, $message, $icon, $link, $kind);
}

// Tell every counselor except the one who made the change.
function notify_other_counselors(string $exceptId, string $title, string $message, string $icon, string $link, string $kind = 'student'): void
{
    foreach (rows("SELECT id FROM users WHERE role = 'counselor' AND archived_at IS NULL AND id <> ?", [$exceptId]) as $c) notify($c['id'], $title, $message, $icon, $link, $kind);
}

function student_label(array $s): string
{
    return trim("{$s['first_name']} {$s['last_name']}") . ($s['student_id'] ? " ({$s['student_id']})" : '');
}

function default_settings(): array
{
    return ['notifications' => ['mood' => true, 'challenge' => true, 'journal' => true, 'appointment' => true], 'privacy' => ['share_mood_notes' => false]];
}

function user_settings(?string $json): array
{
    $s = $json ? json_decode($json, true) : null;
    $d = default_settings();
    if (!is_array($s)) return $d;
    foreach ($d['notifications'] as $k => $v) $d['notifications'][$k] = (bool) ($s['notifications'][$k] ?? $v);
    $d['privacy']['share_mood_notes'] = (bool) ($s['privacy']['share_mood_notes'] ?? false);
    return $d;
}

// ---------- Scoring (mirrors src/lib/scoring.js) ----------
function answer_points(array $q, int $idx): int
{
    return $q['scoring_rule'] === 'positive' ? $idx : 4 - $idx;
}

function score_survey(array $questions, array $answers): int
{
    $total = 0;
    foreach ($questions as $i => $q) $total += answer_points($q, $answers[$i]);
    return (int) round($total / (count($questions) * 4) * 100);
}

function status_for(?int $score): string
{
    if ($score === null) return 'Not enough data yet';
    if ($score >= 80) return 'Thriving';
    if ($score >= 65) return 'Good';
    if ($score >= 50) return 'Doing Okay';
    if ($score >= 35) return 'Could use a boost';
    return 'Extra support may help';
}

function compute_wellness(string $userId, string $asOf): ?array
{
    $vals = q('SELECT mood_value FROM daily_moods WHERE user_id = ? AND date BETWEEN ? AND ?', [$userId, add_days($asOf, -13), $asOf])->fetchAll(PDO::FETCH_COLUMN);
    $moodScore = $vals ? array_sum(array_map(fn($v) => ($v - 1) / 4 * 100, $vals)) / count($vals) : null;
    $survey = val('SELECT score FROM survey_responses WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY submitted_at DESC LIMIT 1', [$userId, add_days($asOf, -30), $asOf]);
    $surveyScore = $survey === null ? null : (float) $survey;
    $acts = (int) val('SELECT COUNT(*) FROM wellness_activities WHERE user_id = ? AND date BETWEEN ? AND ?', [$userId, add_days($asOf, -6), $asOf]);
    $activityScore = min($acts, 5) / 5 * 100;

    if ($moodScore === null && $surveyScore === null) return null;
    $parts = array_filter([[$moodScore, 0.45], [$surveyScore, 0.4], [$activityScore, 0.15]], fn($p) => $p[0] !== null);
    $weight = array_sum(array_column($parts, 1));
    $score = (int) round(array_sum(array_map(fn($p) => $p[0] * $p[1], $parts)) / $weight);
    return ['score' => $score, 'status' => status_for($score)];
}

function record_wellness(string $userId): void
{
    $date = today();
    $w = compute_wellness($userId, $date);
    if (!$w) return;
    q('INSERT INTO wellness_scores (id, user_id, score, status, date, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score), status = VALUES(status), created_at = VALUES(created_at)', [
        uuid(), $userId, $w['score'], $w['status'], $date, now(),
    ]);
}

function create_flag(string $userId, string $source, string $reason): void
{
    if (val("SELECT 1 FROM wellness_flags WHERE user_id = ? AND source = ? AND status <> 'reviewed'", [$userId, $source])) return;
    q('INSERT INTO wellness_flags (id, user_id, source, reason, created_at) VALUES (?, ?, ?, ?, ?)', [uuid(), $userId, $source, $reason, now()]);
    notify_counselors('Wellness review', 'A ' . strtolower($source) . ' may warrant counselor review.', '🚩', '/c/review', 'flag');
}

function log_activity(string $userId, string $type, int $duration = 0, bool $rescore = true): void
{
    q('INSERT INTO wellness_activities (id, user_id, activity_type, duration, date, completed_at) VALUES (?, ?, ?, ?, ?, ?)', [
        uuid(), $userId, $type, $duration, today(), now(),
    ]);
    if ($rescore) record_wellness($userId);
}

function fmt_when(string $date, string $time): string
{
    return date('F j', strtotime($date)) . ' at ' . date('g:i A', strtotime($time));
}

// Sign-in reminders: upcoming appointments and the daily mood nudge (mirrors generateReminders).
function generate_reminders(array $user): void
{
    if ($user['role'] !== 'student') return;
    $prefs = user_settings($user['settings'])['notifications'];
    $today = today();
    if ($prefs['appointment']) {
        $due = rows("SELECT id, date, time FROM appointments WHERE student_id = ? AND status = 'confirmed' AND date IN (?, ?) AND auto_reminded = 0", [$user['id'], $today, add_days($today, 1)]);
        foreach ($due as $a) {
            notify($user['id'], 'Appointment Reminder', 'Your counseling appointment is ' . ($a['date'] === $today ? 'today' : 'tomorrow') . ' at ' . date('g:i A', strtotime($a['time'])) . '.', '🔔', '/s/appointments', 'appointment');
            q('UPDATE appointments SET auto_reminded = 1 WHERE id = ?', [$a['id']]);
        }
    }
    $checkedIn = val('SELECT 1 FROM daily_moods WHERE user_id = ? AND date = ?', [$user['id'], $today]);
    $nudged = val("SELECT 1 FROM notifications WHERE user_id = ? AND kind = 'mood' AND DATE(created_at) = ?", [$user['id'], $today]);
    if ($prefs['mood'] && !$checkedIn && !$nudged) {
        notify($user['id'], 'Daily mood check-in', 'Take a moment to check in with yourself today.', '🌤️', '/s/mood', 'mood');
    }
}

// ---------- Snapshot: everything the signed-in user may see, shaped like the app's data model ----------
function ms(?string $dt): ?int
{
    return $dt === null ? null : strtotime($dt) * 1000;
}

function hm(string $t): string
{
    return substr($t, 0, 5);
}

function json_list(?string $s): array
{
    $v = $s ? json_decode($s, true) : null;
    return is_array($v) ? $v : [];
}

function in_list(array $ids): string
{
    return $ids ? implode(',', array_fill(0, count($ids), '?')) : 'NULL';
}

function map_user(array $u, bool $full): array
{
    $out = [
        'id' => $u['id'], 'first_name' => $u['first_name'], 'last_name' => $u['last_name'], 'role' => $u['role'],
        'title' => $u['title'], 'photo' => $u['photo'] ?? '', 'is_super' => !empty($u['is_super']),
    ];
    if (!$full) return $out;
    return $out + [
        'email' => $u['email'], 'officer_position' => $u['officer_position'] ?? '', 'student_id' => $u['student_id'] ?? '', 'grade_level' => $u['grade_level'] ?? '', 'section' => $u['section'] ?? '',
        'email_verified' => (bool) $u['email_verified'], 'profile_complete' => (bool) $u['profile_complete'],
        'settings' => user_settings($u['settings']), 'created_at' => ms($u['created_at']),
        'archived' => !empty($u['archived_at']), 'archived_at' => ms($u['archived_at'] ?? null),
    ];
}

function empty_snapshot(): array
{
    return [
        'me' => null, 'users' => [], 'moods' => [], 'surveys' => [], 'surveyQuestions' => [], 'surveyResponses' => [], 'wellnessScores' => [],
        'flags' => [], 'journals' => [], 'appointments' => [], 'slots' => [], 'activities' => [], 'notifications' => [], 'challenges' => [],
        'challengeProgress' => [], 'securityLog' => [],
    ];
}

function snapshot(?array $me): array
{
    $db = empty_snapshot();
    if (!$me) return $db;
    $isC = $me['role'] === 'counselor';
    $uid = $me['id'];
    $since = add_days(today(), -180);
    $db['me'] = $uid;

    // Users: counselors see every account; students see themselves and the counselors they can book.
    $users = $isC
        ? rows('SELECT * FROM users')
        : rows("SELECT * FROM users WHERE id = ? OR role = 'counselor'", [$uid]);
    $shareNotes = [];
    foreach ($users as $u) {
        $db['users'][] = map_user($u, $isC || $u['id'] === $uid);
        $shareNotes[$u['id']] = $u['id'] === $uid || user_settings($u['settings'])['privacy']['share_mood_notes'];
    }

    [$own, $p] = $isC ? ['1 = 1', []] : ['user_id = ?', [$uid]];

    foreach (rows("SELECT * FROM daily_moods WHERE $own AND date >= ?", [...$p, $since]) as $m) {
        $visible = $shareNotes[$m['user_id']] ?? false;
        $db['moods'][] = [
            'id' => $m['id'], 'user_id' => $m['user_id'], 'mood' => $m['mood'], 'mood_value' => (int) $m['mood_value'],
            'note' => $visible ? ($m['note'] ?? '') : '', 'mood_factors' => $visible ? json_list($m['mood_factors']) : [],
            'date' => $m['date'], 'time' => hm($m['time']), 'created_at' => ms($m['created_at']), 'updated_at' => ms($m['updated_at']),
        ];
    }

    // Questionnaires: counselors see all of them (with response counts, which lock editing); students only the
    // active one plus any they have answered (needed to show their past results).
    $surveys = $isC
        ? rows('SELECT s.*, (SELECT COUNT(*) FROM survey_responses r WHERE r.survey_id = s.id) AS responses FROM surveys s ORDER BY s.created_at')
        : rows('SELECT * FROM surveys WHERE active = 1 OR id IN (SELECT survey_id FROM survey_responses WHERE user_id = ?)', [$uid]);
    $surveyIds = array_column($surveys, 'id');
    foreach ($surveys as $s) {
        $db['surveys'][] = ['id' => $s['id'], 'title' => $s['title'], 'description' => $s['description'], 'active' => (bool) $s['active'], 'created_at' => ms($s['created_at'])]
            + ($isC ? ['responses' => (int) $s['responses']] : []);
    }
    foreach (rows('SELECT * FROM survey_questions WHERE survey_id IN (' . in_list($surveyIds) . ') ORDER BY sort_order', $surveyIds) as $sq) {
        $db['surveyQuestions'][] = [
            'id' => $sq['id'], 'survey_id' => $sq['survey_id'], 'order' => (int) $sq['sort_order'], 'question' => $sq['question'],
            'question_type' => $sq['question_type'], 'scoring_rule' => $sq['scoring_rule'], 'area' => $sq['area'], 'critical' => (bool) $sq['is_critical'],
        ];
    }
    foreach (rows("SELECT * FROM survey_responses WHERE $own AND date >= ?", [...$p, $since]) as $r) {
        $db['surveyResponses'][] = [
            'id' => $r['id'], 'user_id' => $r['user_id'], 'survey_id' => $r['survey_id'], 'answers' => json_list($r['answers']), 'score' => (int) $r['score'],
            'status' => $r['status'], 'areas' => json_list($r['areas']), 'flagged' => (bool) $r['flagged'], 'date' => $r['date'], 'submitted_at' => ms($r['submitted_at']),
        ];
    }
    foreach (rows("SELECT * FROM wellness_scores WHERE $own AND date >= ?", [...$p, $since]) as $w) {
        $db['wellnessScores'][] = ['id' => $w['id'], 'user_id' => $w['user_id'], 'score' => (int) $w['score'], 'status' => $w['status'], 'date' => $w['date'], 'created_at' => ms($w['created_at'])];
    }

    // Review flags are for counselors only.
    if ($isC) {
        foreach (rows('SELECT * FROM wellness_flags') as $f) {
            $db['flags'][] = [
                'id' => $f['id'], 'user_id' => $f['user_id'], 'source' => $f['source'], 'reason' => $f['reason'], 'status' => $f['status'],
                'created_at' => ms($f['created_at']), 'reviewed_by' => $f['reviewed_by'], 'reviewed_at' => ms($f['reviewed_at']),
            ];
        }
    }

    // Journals: private by default. Counselors only ever receive entries the student shared.
    $journals = $isC ? rows('SELECT * FROM journal_entries WHERE is_shared = 1') : rows('SELECT * FROM journal_entries WHERE user_id = ?', [$uid]);
    foreach ($journals as $j) {
        $db['journals'][] = [
            'id' => $j['id'], 'user_id' => $j['user_id'], 'title' => $j['title'], 'content' => $j['content'], 'mood' => $j['mood'], 'tags' => json_list($j['tags']),
            'date' => $j['entry_date'], 'is_shared' => (bool) $j['is_shared'], 'shared_at' => ms($j['shared_at']), 'created_at' => ms($j['created_at']), 'updated_at' => ms($j['updated_at']),
        ];
    }

    $appts = $isC
        ? rows('SELECT * FROM appointments WHERE date >= ?', [$since])
        : rows('SELECT * FROM appointments WHERE student_id = ?', [$uid]);
    $mySlotIds = [];
    foreach ($appts as $a) {
        $mySlotIds[] = $a['slot_id'];
        $db['appointments'][] = [
            'id' => $a['id'], 'student_id' => $a['student_id'], 'counselor_id' => $a['counselor_id'], 'slot_id' => $a['slot_id'], 'date' => $a['date'],
            'time' => hm($a['time']), 'status' => $a['status'], 'reason' => $a['reason'] ?? '', 'notes' => $isC ? ($a['notes'] ?? '') : '',
            'reminder' => (bool) $a['reminder'], 'auto_reminded' => (bool) $a['auto_reminded'], 'canceled_by' => $a['canceled_by'], 'created_at' => ms($a['created_at']),
        ];
    }

    // Slots: students see open future times plus their own booked ones, without other students' appointment ids.
    $slotIds = array_values(array_filter($mySlotIds));
    $slots = $isC
        ? rows('SELECT * FROM availability_slots WHERE date >= ?', [$since])
        : rows("SELECT * FROM availability_slots WHERE (status = 'open' AND date >= ?) OR id IN (" . in_list($slotIds) . ')', [today(), ...$slotIds]);
    foreach ($slots as $s) {
        $db['slots'][] = [
            'id' => $s['id'], 'counselor_id' => $s['counselor_id'], 'date' => $s['date'], 'time' => hm($s['time']), 'status' => $s['status'],
            'appointment_id' => $isC || in_array($s['id'], $slotIds, true) ? $s['appointment_id'] : null,
        ];
    }

    foreach (rows("SELECT * FROM wellness_activities WHERE $own AND date >= ?", [...$p, $since]) as $a) {
        $db['activities'][] = ['id' => $a['id'], 'user_id' => $a['user_id'], 'activity_type' => $a['activity_type'], 'duration' => (int) $a['duration'], 'date' => $a['date'], 'completed_at' => ms($a['completed_at'])];
    }

    foreach (rows('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [$uid]) as $n) {
        $db['notifications'][] = [
            'id' => $n['id'], 'user_id' => $n['user_id'], 'title' => $n['title'], 'message' => $n['message'], 'icon' => $n['icon'] ?? '🔔',
            'link' => $n['link'] ?? '', 'kind' => $n['kind'], 'read' => (bool) $n['is_read'], 'created_at' => ms($n['created_at']),
        ];
    }

    foreach (rows('SELECT * FROM wellness_challenges') as $c) {
        $db['challenges'][] = ['id' => $c['id'], 'emoji' => $c['emoji'], 'title' => $c['title'], 'description' => $c['description'] ?? '', 'link' => $c['link'] ?? '', 'active' => (bool) $c['active']];
    }
    foreach (rows("SELECT * FROM challenge_progress WHERE $own AND date >= ?", [...$p, add_days(today(), -60)]) as $cp) {
        $db['challengeProgress'][] = ['user_id' => $cp['user_id'], 'challenge_id' => $cp['challenge_id'], 'date' => $cp['date'], 'at' => ms($cp['completed_at'])];
    }

    $log = $isC
        ? rows('SELECT * FROM security_events ORDER BY id DESC LIMIT 50')
        : rows('SELECT * FROM security_events WHERE user_id = ? ORDER BY id DESC LIMIT 20', [$uid]);
    foreach ($log as $e) {
        $db['securityLog'][] = ['id' => (string) $e['id'], 'type' => $e['event_type'], 'user_id' => $e['user_id'], 'detail' => $e['detail'] ?? '', 'at' => ms($e['created_at'])];
    }

    return $db;
}
