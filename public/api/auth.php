<?php
// Authentication: registration, email codes, login/logout, password reset and change.
declare(strict_types=1);

require __DIR__ . '/lib.php';

start_session();
$in = input();
$action = $in['action'] ?? '';

// ---------- One-time codes ----------
function code_hash(string $code, string $email, string $purpose): string
{
    return hash_hmac('sha256', "$code|$email|$purpose", APP_SECRET);
}

function cooldown_left(string $email, string $purpose): int
{
    $sent = val('SELECT created_at FROM email_verifications WHERE email = ? AND purpose = ?', [$email, $purpose]);
    return $sent ? max(0, SECURITY['otp_resend_seconds'] - (time() - strtotime($sent))) : 0;
}

// Issues a code and emails it. Returns the fields the client needs (cooldown, and the code itself in 'show' mode).
// With $quiet, a request inside the resend cooldown is skipped instead of refused.
function issue_code(string $email, string $purpose, bool $quiet = false): array
{
    $wait = cooldown_left($email, $purpose);
    if ($wait > 0) {
        if ($quiet) return ['cooldown' => $wait];
        fail("Please wait $wait seconds before requesting another code.", 429, ['cooldown' => $wait]);
    }
    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    q('REPLACE INTO email_verifications (email, purpose, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, 0, ?, ?)', [
        $email, $purpose, code_hash($code, $email, $purpose), date('Y-m-d H:i:s', time() + SECURITY['otp_ttl_minutes'] * 60), now(),
    ]);
    $reset = $purpose === 'reset';
    $subject = ($reset ? 'Reset your MindTrack password' : 'Verify your MindTrack account') . " · code $code";
    if (MAIL_MODE === 'smtp') {
        require_once __DIR__ . '/mailer.php';
        $mins = SECURITY['otp_ttl_minutes'];
        $name = val('SELECT first_name FROM users WHERE email = ?', [$email]);
        $hello = $name ? "Hi $name," : 'Hi there,';
        $intro = $reset
            ? "$hello\nWe got a request to reset your MindTrack password. Enter this code on the reset page to choose a new one."
            : "$hello\nWelcome to MindTrack! Enter this code to verify your SMCBI email and finish creating your account.";
        $body = "$hello\n\nYour MindTrack " . ($reset ? 'password reset' : 'verification') . " code is: $code\n\nIt expires in $mins minutes. "
            . "If you didn't request this, you can ignore this email.\n\n— SMCBI Guidance Office";
        $html = mail_html([
            'title' => $reset ? 'Reset your password' : 'Verify your email',
            'intro' => $intro,
            'code' => $code,
            'note' => "This code expires in $mins minutes. Don’t share it with anyone.",
            'button' => [$reset ? 'Open the reset page' : 'Open MindTrack', APP_URL . ($reset ? '/#/forgot' : '/#/register')],
            'footer' => $reset
                ? 'Didn’t ask to reset your password? You can ignore this email; your password stays the same.'
                : 'Didn’t sign up for MindTrack? You can ignore this email; no account is created without this code.',
        ]);
        try {
            send_mail($email, $subject, $body, $html);
        } catch (Throwable $e) {
            error_log('MindTrack mail: ' . $e->getMessage());
            q('DELETE FROM email_verifications WHERE email = ? AND purpose = ?', [$email, $purpose]);
            fail(APP_DEBUG ? $e->getMessage() : 'We couldn’t send the email right now. Please try again in a few minutes.', 502);
        }
        return ['cooldown' => SECURITY['otp_resend_seconds']];
    }
    return ['cooldown' => SECURITY['otp_resend_seconds'], 'devMail' => ['to' => $email, 'subject' => $subject, 'code' => $code]];
}

function check_code(string $email, string $purpose, mixed $code): ?string
{
    $o = row('SELECT * FROM email_verifications WHERE email = ? AND purpose = ?', [$email, $purpose]);
    if (!$o) return 'No active code. Please request a new one.';
    if (time() > strtotime($o['expires_at'])) return 'This code has expired. Please request a new one.';
    if ($o['attempts'] >= SECURITY['otp_max_attempts']) return 'Too many attempts. Please request a new code.';
    if (!is_string($code) || !hash_equals($o['code_hash'], code_hash($code, $email, $purpose))) {
        q('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?', [$o['id']]);
        return 'That code doesn’t match. Please check your email and try again.';
    }
    q('DELETE FROM email_verifications WHERE id = ?', [$o['id']]);
    return null;
}

function expected_email(string $first, string $last): string
{
    $slug = function (string $s): string {
        if (class_exists('Normalizer')) $s = preg_replace('/\p{Mn}/u', '', Normalizer::normalize($s, Normalizer::FORM_D));
        return slug_name($s);
    };
    return $slug($last) . $slug($first) . '@' . SCHOOL_EMAIL_DOMAIN;
}

function email_or_fail(mixed $raw): string
{
    $c = check_school_email($raw);
    if (!$c['ok']) fail($c['error'], 400, ['restricted' => !empty($c['restricted'])]);
    return $c['email'];
}

function start_user_session(array $user): never
{
    sign_in($user['id']);
    generate_reminders($user);
    respond(['ok' => true, 'db' => snapshot($user)]);
}

switch ($action) {
    case 'register': {
        $first = str($in['first'] ?? '', 80);
        $last = str($in['last'] ?? '', 80);
        if ($first === '' || $last === '') fail('Please enter your first and last name.');
        $email = email_or_fail($in['email'] ?? '');
        if ($email !== expected_email($first, $last)) fail('Your SMCBI email should follow lastnamefirstname — for example ' . expected_email($first, $last));
        if ($err = check_password($in['password'] ?? null)) fail($err);
        $existing = row('SELECT id, email_verified FROM users WHERE email = ?', [$email]);
        if ($existing && $existing['email_verified']) fail('An account with this email already exists. Please log in instead.');
        $hash = password_hash($in['password'], PASSWORD_DEFAULT);
        if ($existing) {
            $id = $existing['id'];
            q('UPDATE users SET first_name = ?, last_name = ?, password_hash = ? WHERE id = ?', [$first, $last, $hash, $id]);
        } else {
            $id = uuid();
            q("INSERT INTO users (id, first_name, last_name, email, password_hash, role, settings, created_at) VALUES (?, ?, ?, ?, ?, 'student', ?, ?)", [
                $id, $first, $last, $email, $hash, json_encode(default_settings()), now(),
            ]);
        }
        q('DELETE FROM deleted_accounts WHERE email = ?', [$email]); // a fresh start after a deleted account
        log_event('register', $id, $email);
        respond(['ok' => true] + issue_code($email, 'verify', true));
    }

    case 'resend': {
        $email = email_or_fail($in['email'] ?? '');
        $purpose = ($in['purpose'] ?? '') === 'reset' ? 'reset' : 'verify';
        $u = row('SELECT email_verified, archived_at FROM users WHERE email = ?', [$email]);
        // Only send to accounts in the right state, but answer the same either way so emails can't be enumerated.
        $ok = $u && !$u['archived_at'] && ($purpose === 'reset' || !$u['email_verified']);
        respond(['ok' => true] + ($ok ? issue_code($email, $purpose) : ['cooldown' => SECURITY['otp_resend_seconds']]));
    }

    case 'verify': {
        $email = email_or_fail($in['email'] ?? '');
        $u = row('SELECT * FROM users WHERE email = ?', [$email]);
        if (!$u) fail('No active code. Please request a new one.');
        if ($err = check_code($email, 'verify', $in['code'] ?? null)) fail($err);
        q('UPDATE users SET email_verified = 1 WHERE id = ?', [$u['id']]);
        log_event('email_verified', $u['id'], $email);
        $u['email_verified'] = 1;
        start_user_session($u);
    }

    case 'login': {
        $c = check_school_email($in['email'] ?? '');
        if (!$c['ok']) {
            if (!empty($c['restricted'])) log_event('login_blocked_domain', null, strtolower(trim((string) ($in['email'] ?? ''))));
            fail($c['error'], 400, ['restricted' => !empty($c['restricted'])]);
        }
        $email = $c['email'];
        $lock = row('SELECT * FROM login_attempts WHERE email = ?', [$email]);
        if ($lock && $lock['locked_until'] && strtotime($lock['locked_until']) > time()) {
            $mins = (int) ceil((strtotime($lock['locked_until']) - time()) / 60);
            fail("Too many unsuccessful attempts. Please try again in $mins minute" . ($mins > 1 ? 's' : '') . '.', 429);
        }
        $u = row('SELECT * FROM users WHERE email = ?', [$email]);
        $password = is_string($in['password'] ?? null) ? $in['password'] : '';
        // Hash against a dummy when the account doesn't exist so response time doesn't reveal which emails are registered.
        $valid = password_verify($password, $u['password_hash'] ?? '$2y$10$kTm3JXvLWniL7UA7USRBYuxycGyy9EoAr3bhdNJKgp9WTZHqtJsCa');
        // A deleted account: explain it, but only when the old password is right, so nobody can probe which
        // emails were removed.
        if (!$u) {
            $gone = row('SELECT password_hash FROM deleted_accounts WHERE email = ?', [$email]);
            if ($gone && password_verify($password, $gone['password_hash'])) {
                log_event('login_deleted', null, $email);
                fail(DELETED_MSG, 410, ['deleted' => true]);
            }
        }
        if (!$u || !$valid) {
            $count = (int) ($lock['count'] ?? 0) + 1;
            $lockedUntil = $count >= SECURITY['max_login_attempts'] ? date('Y-m-d H:i:s', time() + SECURITY['lockout_minutes'] * 60) : null;
            q('REPLACE INTO login_attempts (email, count, locked_until) VALUES (?, ?, ?)', [$email, $lockedUntil ? 0 : $count, $lockedUntil]);
            log_event('login_failed', $u['id'] ?? null, $email);
            $left = SECURITY['max_login_attempts'] - $count;
            fail($lockedUntil
                ? 'Too many unsuccessful attempts. Please try again in ' . SECURITY['lockout_minutes'] . ' minutes.'
                : "Incorrect email or password. $left attempt" . ($left > 1 ? 's' : '') . ' left.');
        }
        q('DELETE FROM login_attempts WHERE email = ?', [$email]);
        // The login screen asks "Student or Counselor?" first; only checked after a correct password,
        // so the answer never reveals what kind of account an email belongs to.
        $wanted = $in['role'] ?? null;
        if (in_array($wanted, ['student', 'counselor'], true) && $u['role'] !== $wanted) {
            fail($u['role'] === 'counselor'
                ? 'This is a guidance counselor account. Please use Counselor login.'
                : 'This is a student account. Please use Student login.', 400, ['wrongRole' => $u['role']]);
        }
        if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
            q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $u['id']]);
        }
        if (!empty($u['archived_at'])) {
            log_event('login_archived', $u['id'], $email);
            fail(ARCHIVED_MSG, 403, ['archived' => true]);
        }
        if (!$u['email_verified']) {
            respond(['ok' => false, 'unverified' => true, 'email' => $email] + issue_code($email, 'verify', true));
        }
        // One device per account: refuse while another device is signed in and still active.
        if (session_in_use($u)) {
            log_event('login_in_use', $u['id'], $email);
            fail(IN_USE_MSG, 409, ['inUse' => true]);
        }
        log_event('login', $u['id'], $email);
        start_user_session($u);
    }

    // Heartbeat from a signed-in page: keeps this device's hold on the account (see SESSION_ALIVE_SECONDS).
    case 'ping': {
        require_user();
        respond(['ok' => true]);
    }

    // The page is closing: let another device sign in right away. The session itself stays valid, so a
    // refresh or reopening the tab simply checks in again.
    case 'away': {
        if (!empty($_SESSION['uid']) && !empty($_SESSION['tok'])) {
            q('UPDATE users SET session_seen_at = NULL WHERE id = ? AND session_token = ?', [$_SESSION['uid'], $_SESSION['tok']]);
        }
        respond(['ok' => true]);
    }

    case 'logout': {
        if (!empty($_SESSION['uid'])) log_event(($in['reason'] ?? '') === 'idle' ? 'session_timeout' : 'logout', $_SESSION['uid']);
        sign_out();
        respond(['ok' => true, 'db' => empty_snapshot()]);
    }

    case 'forgot': {
        $email = email_or_fail($in['email'] ?? '');
        $exists = val('SELECT 1 FROM users WHERE email = ? AND archived_at IS NULL', [$email]);
        respond(['ok' => true] + ($exists ? issue_code($email, 'reset', true) : ['cooldown' => SECURITY['otp_resend_seconds']]));
    }

    case 'reset': {
        $email = email_or_fail($in['email'] ?? '');
        if ($err = check_password($in['password'] ?? null)) fail($err, 400, ['field' => 'pw']);
        if ($err = check_code($email, 'reset', $in['code'] ?? null)) fail($err, 400, ['field' => 'code']);
        $id = val('SELECT id FROM users WHERE email = ? AND archived_at IS NULL', [$email]);
        if (!$id) fail('No active code. Please request a new one.', 400, ['field' => 'code']);
        // Resetting the password also signs out whatever device was using the account.
        q('UPDATE users SET password_hash = ?, email_verified = 1, session_token = NULL, session_seen_at = NULL WHERE id = ?', [password_hash($in['password'], PASSWORD_DEFAULT), $id]);
        q('DELETE FROM login_attempts WHERE email = ?', [$email]);
        log_event('password_reset', $id, $email);
        notify($id, 'Your password was reset', 'Your MindTrack password was just reset with a code sent to your school email. If this wasn’t you, contact the SMCBI Guidance Office.', '🔑', '/s/profile', 'security');
        respond(['ok' => true]);
    }

    case 'change_password': {
        $u = require_user();
        if (!password_verify((string) ($in['current'] ?? ''), $u['password_hash'])) fail('Your current password is incorrect.');
        if ($err = check_password($in['next'] ?? null)) fail($err);
        q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($in['next'], PASSWORD_DEFAULT), $u['id']]);
        log_event('password_changed', $u['id']);
        notify($u['id'], 'Your password was changed', 'Your MindTrack password was just changed. If this wasn’t you, contact the SMCBI Guidance Office right away.', '🔑', $u['role'] === 'counselor' ? '/c/settings' : '/s/profile', 'security');
        respond(['ok' => true]);
    }

    default:
        fail('Unknown action.', 404);
}
