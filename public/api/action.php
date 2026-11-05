<?php
// Every data change goes through here. Each action checks the caller's role and ownership on the server,
// then the response carries the action's result plus a fresh snapshot for the app.
declare(strict_types=1);

require __DIR__ . '/lib.php';

start_session();
$in = input();
$me = require_user();
$uid = $me['id'];

$need = function (string $role) use ($me): void {
    if ($me['role'] !== $role) fail('You don’t have access to this.', 403);
};

// Things only the superadmin may do: manage staff accounts, edit questionnaires, name officers, delete students.
$needSuper = function () use ($me): void {
    if ($me['role'] !== 'counselor' || empty($me['is_super'])) fail('Only the superadmin can do this.', 403);
};

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
// Keep in sync with OFFICER_POSITIONS in src/config.js.
const OFFICER_POSITIONS = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Auditor', 'P.R.O.', 'Representative', 'Peer Facilitator'];
const TAKEN = 'Sorry, this time was just taken. Please choose another time.';

function own_appointment(string $id, array $me): array
{
    $a = row('SELECT * FROM appointments WHERE id = ?', [$id]);
    $allowed = $a && ($me['role'] === 'counselor' || $a['student_id'] === $me['id']);
    if (!$allowed) fail('Appointment not found.', 404);
    return $a;
}

function free_slot(?string $slotId): void
{
    if ($slotId) q("UPDATE availability_slots SET status = 'open', appointment_id = NULL WHERE id = ?", [$slotId]);
}

// Locks an open, not-yet-past slot for booking, or returns null if someone else got it first.
function lock_open_slot(mixed $slotId): ?array
{
    if (!is_string($slotId)) return null;
    $s = row('SELECT * FROM availability_slots WHERE id = ? FOR UPDATE', [$slotId]);
    return $s && $s['status'] === 'open' && $s['date'] >= today() ? $s : null;
}

function survey_or_fail(string $id): array
{
    $s = row('SELECT * FROM surveys WHERE id = ?', [$id]);
    if (!$s) fail('Questionnaire not found.', 404);
    return $s;
}

function survey_responses(string $surveyId): int
{
    return (int) val('SELECT COUNT(*) FROM survey_responses WHERE survey_id = ?', [$surveyId]);
}

function survey_editable_or_fail(string $surveyId): array
{
    $s = survey_or_fail($surveyId);
    if (survey_responses($surveyId)) {
        fail('Students have already answered this questionnaire, so its questions are locked. Duplicate it to make an editable new version.', 409);
    }
    return $s;
}

function renumber_questions(string $surveyId): void
{
    $ids = q('SELECT id FROM survey_questions WHERE survey_id = ? ORDER BY sort_order', [$surveyId])->fetchAll(PDO::FETCH_COLUMN);
    foreach ($ids as $n => $qid) q('UPDATE survey_questions SET sort_order = ? WHERE id = ?', [$n + 1, $qid]);
}

// ---------- Student management helpers ----------
function student_or_fail(string $id): array
{
    $s = row("SELECT * FROM users WHERE id = ? AND role = 'student'", [$id]);
    if (!$s) fail('Student not found.', 404);
    return $s;
}

// Validates and normalises the editable student fields; fails with a field name the form can highlight.
function student_fields(array $in, ?string $exceptId): array
{
    $first = str($in['first_name'] ?? '', 80);
    $last = str($in['last_name'] ?? '', 80);
    if ($first === '') fail('Please enter the first name.', 400, ['field' => 'first_name']);
    if ($last === '') fail('Please enter the last name.', 400, ['field' => 'last_name']);
    $c = check_school_email($in['email'] ?? '');
    if (!$c['ok']) fail($c['error'], 400, ['field' => 'email']);
    $email = $c['email'];
    if (val('SELECT 1 FROM users WHERE email = ? AND id <> ?', [$email, $exceptId ?? ''])) fail('Another account already uses this email.', 400, ['field' => 'email']);
    $sid = strtoupper(preg_replace('/[\s-]/', '', str($in['student_id'] ?? '', 20)));
    if (!preg_match(STUDENT_ID_PATTERN, $sid)) fail('Use the school Student ID: C24 followed by 4 digits, for example C243061.', 400, ['field' => 'student_id']);
    if (val('SELECT 1 FROM users WHERE student_id = ? AND id <> ?', [$sid, $exceptId ?? ''])) fail('Another student already has this Student ID.', 400, ['field' => 'student_id']);
    $grade = $in['grade_level'] ?? '';
    if (!in_array($grade, YEAR_LEVELS, true)) fail('Please select the year level.', 400, ['field' => 'grade_level']);
    $section = strtoupper(str($in['section'] ?? '', 40));
    if ($section === '') fail('Please enter the section.', 400, ['field' => 'section']);
    return compact('first', 'last', 'email', 'sid', 'grade', 'section');
}

// Cancels a student's upcoming appointments and reopens their time slots (used when archiving or deleting).
function release_appointments(string $studentId): void
{
    $upcoming = rows("SELECT id, slot_id FROM appointments WHERE student_id = ? AND status IN ('pending', 'confirmed') AND date >= ?", [$studentId, today()]);
    foreach ($upcoming as $a) {
        q("UPDATE appointments SET status = 'canceled', canceled_by = 'counselor' WHERE id = ?", [$a['id']]);
        free_slot($a['slot_id']);
    }
}

// ---------- Staff (admin) account helpers ----------
function staff_or_fail(string $id): array
{
    $s = row("SELECT * FROM users WHERE id = ? AND role = 'counselor'", [$id]);
    if (!$s) fail('Staff account not found.', 404);
    return $s;
}

function staff_fields(array $in, ?string $exceptId): array
{
    $first = str($in['first_name'] ?? '', 80);
    $last = str($in['last_name'] ?? '', 80);
    if ($first === '') fail('Please enter the first name.', 400, ['field' => 'first_name']);
    if ($last === '') fail('Please enter the last name.', 400, ['field' => 'last_name']);
    $c = check_school_email($in['email'] ?? '');
    if (!$c['ok']) fail($c['error'], 400, ['field' => 'email']);
    $email = $c['email'];
    if (val('SELECT 1 FROM users WHERE email = ? AND id <> ?', [$email, $exceptId ?? ''])) fail('Another account already uses this email.', 400, ['field' => 'email']);
    $title = str($in['title'] ?? '', 80) ?: 'Guidance Counselor';
    return compact('first', 'last', 'email', 'title');
}

function string_list(mixed $v, int $maxItems, int $maxLen): array
{
    if (!is_array($v)) return [];
    $out = [];
    foreach ($v as $x) {
        if (is_string($x) && ($x = str($x, $maxLen)) !== '' && !in_array($x, $out, true)) $out[] = $x;
    }
    return array_slice($out, 0, $maxItems);
}

$result = null;

switch ($in['action'] ?? '') {
    // ---------- Student: mood, survey, activities, challenges ----------
    case 'saveMood': {
        $need('student');
        $mood = $in['mood'] ?? '';
        if (!is_string($mood) || !isset(MOOD_VALUES[$mood])) fail('Please choose the mood that fits best.');
        $factors = array_values(array_intersect(string_list($in['factors'] ?? [], 9, 20), FACTOR_KEYS));
        $data = [$mood, MOOD_VALUES[$mood], str($in['note'] ?? '', 500), json_encode($factors), date('H:i'), now()];
        $date = today();
        $existing = val('SELECT id FROM daily_moods WHERE user_id = ? AND date = ?', [$uid, $date]);
        if ($existing) {
            q('UPDATE daily_moods SET mood = ?, mood_value = ?, note = ?, mood_factors = ?, time = ?, updated_at = ? WHERE id = ?', [...$data, $existing]);
        } else {
            q('INSERT INTO daily_moods (mood, mood_value, note, mood_factors, time, updated_at, id, user_id, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [...$data, uuid(), $uid, $date, now()]);
        }
        record_wellness($uid);
        $low = (int) val('SELECT COUNT(*) FROM daily_moods WHERE user_id = ? AND date >= ? AND mood IN (' . in_list(LOW_MOODS) . ')', [$uid, add_days($date, -6), ...LOW_MOODS]);
        if ($low >= FLAG_RULES['low_mood_days_in_week']) {
            create_flag($uid, 'Daily Mood', "$low check-ins in the past 7 days were Sad, Lonely, Anxious or Overwhelmed.");
        }
        $result = ['updated' => (bool) $existing];
        break;
    }

    case 'submitSurvey': {
        $need('student');
        $surveyId = (string) ($in['surveyId'] ?? '');
        if (!val('SELECT active FROM surveys WHERE id = ?', [$surveyId])) fail('This survey isn’t available right now.');
        $qs = rows('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order', [$surveyId]);
        $answers = $in['answers'] ?? null;
        if (!is_array($answers) || !array_is_list($answers) || count($answers) !== count($qs)) fail('Please answer every question.');
        foreach ($answers as $a) {
            if (!is_int($a) || $a < 0 || $a > 4) fail('Please answer every question.');
        }
        $score = score_survey($qs, $answers);
        $critical = false;
        $areas = [];
        foreach ($qs as $i => $question) {
            if ($question['is_critical'] && $answers[$i] >= FLAG_RULES['critical_item_min_answer']) $critical = true;
            if (answer_points($question, $answers[$i]) <= 1) $areas[] = $question['area'];
        }
        $flagged = $score < FLAG_RULES['survey_score_below'] || $critical;
        $id = uuid();
        q('INSERT INTO survey_responses (id, user_id, survey_id, answers, score, status, areas, flagged, date, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            $id, $uid, $surveyId, json_encode($answers), $score, status_for($score), json_encode($areas), (int) $flagged, today(), now(),
        ]);
        log_activity($uid, 'survey', 0, false);
        record_wellness($uid);
        if ($flagged) {
            create_flag($uid, 'Wellness Check', $critical ? 'A response met the school’s review criteria.' : "Wellness check score of $score is below the review threshold.");
        }
        $result = $id;
        break;
    }

    case 'logActivity': {
        $need('student');
        $type = $in['type'] ?? '';
        if (!in_array($type, ['breathing', 'bubble_pop'], true)) fail('Unknown activity.');
        log_activity($uid, $type, max(0, min(3600, (int) ($in['duration'] ?? 0))));
        break;
    }

    case 'toggleChallenge': {
        $need('student');
        $cid = (string) ($in['challengeId'] ?? '');
        if (!val('SELECT 1 FROM wellness_challenges WHERE id = ? AND active = 1', [$cid])) fail('Challenge not found.', 404);
        $date = today();
        $done = (bool) val('SELECT 1 FROM challenge_progress WHERE user_id = ? AND challenge_id = ? AND date = ?', [$uid, $cid, $date]);
        if ($done) {
            q('DELETE FROM challenge_progress WHERE user_id = ? AND challenge_id = ? AND date = ?', [$uid, $cid, $date]);
        } else {
            q('INSERT INTO challenge_progress (user_id, challenge_id, date, completed_at) VALUES (?, ?, ?, ?)', [$uid, $cid, $date, now()]);
            log_activity($uid, 'challenge');
        }
        $result = !$done;
        break;
    }

    // ---------- Student: journal ----------
    case 'saveJournal': {
        $need('student');
        $content = is_string($in['content'] ?? null) ? mb_substr($in['content'], 0, 20000) : '';
        if (trim($content) === '') fail('Write a few words before saving.');
        $date = $in['date'] ?? '';
        if (!is_date($date) || $date > today()) fail('Please choose a valid date that isn’t in the future.');
        $mood = isset(MOOD_VALUES[$in['mood'] ?? '']) ? $in['mood'] : null;
        $shared = !empty($in['is_shared']);
        $title = str($in['title'] ?? '', 80) ?: 'Untitled entry';
        $tags = json_encode(string_list($in['tags'] ?? [], 10, 30));
        $id = is_string($in['id'] ?? null) ? $in['id'] : null;
        if ($id) {
            $existing = row('SELECT is_shared, shared_at FROM journal_entries WHERE id = ? AND user_id = ?', [$id, $uid]);
            if (!$existing) fail('Journal entry not found.', 404);
            $sharedNow = $shared && !$existing['is_shared'];
            $sharedAt = $shared === (bool) $existing['is_shared'] ? $existing['shared_at'] : ($shared ? now() : null);
            q('UPDATE journal_entries SET title = ?, content = ?, mood = ?, tags = ?, entry_date = ?, is_shared = ?, shared_at = ?, updated_at = ? WHERE id = ?', [
                $title, $content, $mood, $tags, $date, (int) $shared, $sharedAt, now(), $id,
            ]);
        } else {
            $id = uuid();
            $sharedNow = $shared;
            q('INSERT INTO journal_entries (id, user_id, title, content, mood, tags, entry_date, is_shared, shared_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                $id, $uid, $title, $content, $mood, $tags, $date, (int) $shared, $shared ? now() : null, now(), now(),
            ]);
            log_activity($uid, 'journal');
        }
        log_event($shared ? 'journal_shared' : 'journal_saved_private', $uid, $id);
        if ($sharedNow) notify_counselors('Journal shared with you', 'A student shared a journal entry with the guidance office.', '📝', '/c/journals', 'journal');
        $result = $id;
        break;
    }

    case 'deleteJournal': {
        $need('student');
        $id = (string) ($in['id'] ?? '');
        q('DELETE FROM journal_entries WHERE id = ? AND user_id = ?', [$id, $uid]);
        log_event('journal_deleted', $uid, $id);
        break;
    }

    // ---------- Appointments ----------
    case 'bookAppointment': {
        $need('student');
        db()->beginTransaction();
        $slot = lock_open_slot($in['slotId'] ?? null);
        if (!$slot) {
            db()->rollBack();
            $result = ['ok' => false, 'error' => TAKEN];
            break;
        }
        $id = uuid();
        q("INSERT INTO appointments (id, student_id, counselor_id, slot_id, date, time, status, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)", [
            $id, $uid, $slot['counselor_id'], $slot['id'], $slot['date'], $slot['time'], str($in['reason'] ?? '', 200), now(),
        ]);
        q("UPDATE availability_slots SET status = 'booked', appointment_id = ? WHERE id = ?", [$id, $slot['id']]);
        db()->commit();
        notify($slot['counselor_id'], 'New appointment request', 'A student requested ' . fmt_when($slot['date'], $slot['time']) . '.', '📅', '/c/appointments', 'appointment');
        $result = ['ok' => true, 'id' => $id];
        break;
    }

    case 'rescheduleAppointment': {
        $need('student');
        $a = own_appointment((string) ($in['apptId'] ?? ''), $me);
        if (!in_array($a['status'], ['pending', 'confirmed'], true)) fail('This appointment can no longer be changed.');
        db()->beginTransaction();
        $slot = lock_open_slot($in['slotId'] ?? null);
        if (!$slot) {
            db()->rollBack();
            $result = ['ok' => false, 'error' => TAKEN];
            break;
        }
        free_slot($a['slot_id']);
        q("UPDATE availability_slots SET status = 'booked', appointment_id = ? WHERE id = ?", [$a['id'], $slot['id']]);
        q("UPDATE appointments SET slot_id = ?, date = ?, time = ?, counselor_id = ?, status = 'pending', reminder = 0, auto_reminded = 0 WHERE id = ?", [
            $slot['id'], $slot['date'], $slot['time'], $slot['counselor_id'], $a['id'],
        ]);
        db()->commit();
        notify($slot['counselor_id'], 'Appointment rescheduled', 'A student moved their session to ' . fmt_when($slot['date'], $slot['time']) . '.', '📅', '/c/appointments');
        $result = ['ok' => true, 'id' => $a['id']];
        break;
    }

    case 'cancelAppointment': {
        $a = own_appointment((string) ($in['apptId'] ?? ''), $me);
        if (!in_array($a['status'], ['pending', 'confirmed'], true)) fail('This appointment can no longer be canceled.');
        q("UPDATE appointments SET status = 'canceled', canceled_by = ? WHERE id = ?", [$me['role'], $a['id']]);
        if ($a['date'] >= today()) free_slot($a['slot_id']);
        $when = fmt_when($a['date'], $a['time']);
        if ($me['role'] === 'student') notify($a['counselor_id'], 'Appointment canceled', "A student canceled the session on $when.", '📅', '/c/appointments');
        else notify($a['student_id'], 'Appointment update', "Your session on $when could not go ahead. You’re welcome to book another time.", '📅', '/s/appointments');
        break;
    }

    case 'addReminder': {
        $need('student');
        $a = own_appointment((string) ($in['apptId'] ?? ''), $me);
        q('UPDATE appointments SET reminder = 1 WHERE id = ?', [$a['id']]);
        notify($uid, 'Appointment Reminder', 'Reminder set: your counseling session is on ' . fmt_when($a['date'], $a['time']) . '.', '🔔', '/s/appointments', 'appointment');
        break;
    }

    case 'setAppointmentStatus': {
        $need('counselor');
        $a = own_appointment((string) ($in['apptId'] ?? ''), $me);
        $status = $in['status'] ?? '';
        if (!in_array($status, ['pending', 'confirmed', 'completed', 'canceled'], true)) fail('Unknown status.');
        $notes = array_key_exists('notes', $in) ? mb_substr((string) $in['notes'], 0, 5000) : $a['notes'];
        q('UPDATE appointments SET status = ?, notes = ?, canceled_by = IF(? = \'canceled\', \'counselor\', canceled_by) WHERE id = ?', [$status, $notes, $status, $a['id']]);
        if ($status === 'canceled' && $a['status'] !== 'canceled') free_slot($a['slot_id']);
        $when = fmt_when($a['date'], $a['time']);
        if ($status === 'confirmed' && $a['status'] !== 'confirmed') {
            notify($a['student_id'], 'Appointment confirmed', "Your counseling session on $when is confirmed.", '✅', '/s/appointments', 'appointment');
        }
        if ($status === 'completed' && $a['status'] !== 'completed') {
            notify($a['student_id'], 'Session completed', "Your counseling session on $when is marked as completed. Thank you for reaching out. You can book another session anytime.", '✅', '/s/appointments', 'appointment');
        }
        if ($status === 'canceled' && $a['status'] !== 'canceled') {
            notify($a['student_id'], 'Appointment update', "Your session on $when could not go ahead. You’re welcome to book another time.", '📅', '/s/appointments');
        }
        break;
    }

    // ---------- Counselor: availability ----------
    case 'addAvailability': {
        $need('counselor');
        $dates = array_filter(string_list($in['dates'] ?? [], 31, 10), fn($d) => is_date($d) && $d >= today());
        $times = array_filter(string_list($in['times'] ?? [], 24, 5), 'is_time');
        $added = 0;
        foreach ($dates as $d) {
            foreach ($times as $t) {
                $added += q('INSERT IGNORE INTO availability_slots (id, counselor_id, date, time) VALUES (?, ?, ?, ?)', [uuid(), $uid, $d, $t])->rowCount();
            }
        }
        $result = $added;
        break;
    }

    case 'blockDate': {
        $need('counselor');
        $date = $in['date'] ?? '';
        if (!is_date($date)) fail('Please choose a valid date.');
        $result = q("UPDATE availability_slots SET status = 'blocked' WHERE counselor_id = ? AND date = ? AND status = 'open'", [$uid, $date])->rowCount();
        break;
    }

    case 'setSlotStatus': {
        $need('counselor');
        $status = $in['status'] ?? '';
        if (!in_array($status, ['open', 'blocked'], true)) fail('Unknown status.');
        q("UPDATE availability_slots SET status = ? WHERE id = ? AND counselor_id = ? AND status <> 'booked'", [$status, (string) ($in['slotId'] ?? ''), $uid]);
        break;
    }

    // ---------- Counselor: review flags & challenges ----------
    case 'reviewFlag': {
        $need('counselor');
        $status = $in['status'] ?? '';
        if (!in_array($status, ['reviewed', 'follow_up'], true)) fail('Unknown status.');
        $flag = row('SELECT * FROM wellness_flags WHERE id = ?', [(string) ($in['flagId'] ?? '')]);
        if (!$flag) fail('Flag not found.', 404);
        q('UPDATE wellness_flags SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?', [$status, $uid, now(), $flag['id']]);
        log_event("flag_$status", $uid, $flag['id']);
        if ($status === 'follow_up') {
            notify($flag['user_id'], 'Your guidance counselor would like to check in', 'No worries — this is just a friendly check-in. Book a time that works for you whenever you’re ready.', '🤝', '/s/appointments/book', 'appointment');
        }
        break;
    }

    case 'saveChallenge': {
        $need('counselor');
        $id = is_string($in['id'] ?? null) ? $in['id'] : null;
        if ($id) {
            $c = row('SELECT * FROM wellness_challenges WHERE id = ?', [$id]);
            if (!$c) fail('Challenge not found.', 404);
            q('UPDATE wellness_challenges SET emoji = ?, title = ?, description = ?, active = ? WHERE id = ?', [
                array_key_exists('emoji', $in) ? str($in['emoji'], 16) : $c['emoji'],
                array_key_exists('title', $in) ? (str($in['title'], 120) ?: $c['title']) : $c['title'],
                array_key_exists('description', $in) ? str($in['description'], 255) : $c['description'],
                array_key_exists('active', $in) ? (int) (bool) $in['active'] : $c['active'],
                $id,
            ]);
        } else {
            $title = str($in['title'] ?? '', 120);
            if ($title === '') fail('Please describe the challenge.');
            q('INSERT INTO wellness_challenges (id, emoji, title, description, link, active) VALUES (?, ?, ?, ?, ?, 1)', [
                uuid(), str($in['emoji'] ?? '', 16) ?: '🌿', $title, str($in['description'] ?? '', 255), '',
            ]);
        }
        break;
    }

    case 'deleteChallenge': {
        $need('counselor');
        q('DELETE FROM wellness_challenges WHERE id = ?', [(string) ($in['id'] ?? '')]);
        break;
    }

    // ---------- Counselor: student accounts (create, update, archive, restore, delete) ----------
    case 'createStudent': {
        $need('counselor');
        $f = student_fields($in, null);
        $id = uuid();
        // The student sets their own password with "Forgot password"; this random one is never shared.
        q("INSERT INTO users (id, first_name, last_name, email, password_hash, role, student_id, grade_level, section, email_verified, profile_complete, settings, created_at)
           VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?, 1, 1, ?, ?)", [
            $id, $f['first'], $f['last'], $f['email'], password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT),
            $f['sid'], $f['grade'], $f['section'], json_encode(default_settings()), now(),
        ]);
        log_event('student_created', $uid, $f['sid']);
        notify($id, 'Welcome to MindTrack', 'The SMCBI Guidance Office set up your account. Start by checking in with your mood today. Everything you share here is private by default.', '🌱', '/s/mood');
        $who = "{$me['first_name']} {$me['last_name']}";
        notify_other_counselors($uid, 'New student added', "{$f['first']} {$f['last']} ({$f['sid']}) · {$f['grade']} · {$f['section']} was added by $who.", '👤', "/c/students/$id");
        $invited = false;
        if (!empty($in['invite']) && MAIL_MODE === 'smtp') {
            require_once __DIR__ . '/mailer.php';
            try {
                $steps = "1. Open " . APP_URL . "/#/forgot\n2. Enter this email ({$f['email']})\n3. Type the 6-digit code we email you and choose a password.";
                send_mail($f['email'], 'Your MindTrack account is ready', "Hello {$f['first']}!\n\n"
                    . "The SMCBI Guidance Office created a MindTrack account for you.\n\nTo start, set your password:\n$steps\n\n"
                    . "MindTrack is a private space to check in with your mood, take a breather and reach the guidance office.\n\n— SMCBI Guidance Office",
                    mail_html([
                        'title' => 'Your MindTrack account is ready',
                        'intro' => "Hi {$f['first']},\nThe SMCBI Guidance Office set up a MindTrack account for you: a private space to check in with your mood, take a breather and reach the guidance office.\n\nTo start, set your password:\n$steps",
                        'button' => ['Set my password', APP_URL . '/#/forgot'],
                        'footer' => 'Your journal and mood notes are private by default. Counselors only see what you choose to share.',
                    ]));
                $invited = true;
            } catch (Throwable $e) {
                error_log('MindTrack invite: ' . $e->getMessage());
            }
        }
        $result = ['id' => $id, 'invited' => $invited];
        break;
    }

    case 'updateStudent': {
        $need('counselor');
        $s = student_or_fail((string) ($in['id'] ?? ''));
        $f = student_fields($in, $s['id']);
        q('UPDATE users SET first_name = ?, last_name = ?, email = ?, student_id = ?, grade_level = ?, section = ? WHERE id = ?', [
            $f['first'], $f['last'], $f['email'], $f['sid'], $f['grade'], $f['section'], $s['id'],
        ]);
        log_event('student_updated', $uid, $f['sid']);
        break;
    }

    case 'archiveStudent': {
        $need('counselor');
        $s = student_or_fail((string) ($in['id'] ?? ''));
        if ($s['archived_at']) break;
        q('UPDATE users SET archived_at = ? WHERE id = ?', [now(), $s['id']]);
        release_appointments($s['id']);
        log_event('student_archived', $uid, (string) $s['student_id']);
        notify_other_counselors($uid, 'Student archived', student_label($s) . " was archived by {$me['first_name']} {$me['last_name']}. Upcoming sessions were cancelled.", '🔒', "/c/students/{$s['id']}");
        break;
    }

    case 'restoreStudent': {
        $need('counselor');
        $s = student_or_fail((string) ($in['id'] ?? ''));
        q('UPDATE users SET archived_at = NULL WHERE id = ?', [$s['id']]);
        log_event('student_restored', $uid, (string) $s['student_id']);
        notify_other_counselors($uid, 'Student restored', student_label($s) . " was restored by {$me['first_name']} {$me['last_name']} and can sign in again.", '✅', "/c/students/{$s['id']}");
        break;
    }

    case 'deleteStudent': {
        $needSuper();
        $s = student_or_fail((string) ($in['id'] ?? ''));
        // Deliberate step: the counselor must type the student's ID (or email, if no ID yet) to confirm.
        $expected = $s['student_id'] ?: $s['email'];
        if (strtoupper(trim((string) ($in['confirm'] ?? ''))) !== strtoupper($expected)) fail('Type the Student ID exactly to confirm deleting this account.', 400, ['field' => 'confirm']);
        db()->beginTransaction();
        release_appointments($s['id']);
        q('UPDATE availability_slots SET status = \'open\', appointment_id = NULL WHERE appointment_id IN (SELECT id FROM appointments WHERE student_id = ?)', [$s['id']]);
        q('DELETE FROM email_verifications WHERE email = ?', [$s['email']]);
        q('DELETE FROM login_attempts WHERE email = ?', [$s['email']]);
        // Kept only so a login attempt can be told the account was removed (see auth.php); no other data is kept.
        q('REPLACE INTO deleted_accounts (email, password_hash, deleted_at) VALUES (?, ?, ?)', [$s['email'], $s['password_hash'], now()]);
        q('DELETE FROM users WHERE id = ?', [$s['id']]); // moods, journals, surveys, appointments… cascade
        db()->commit();
        log_event('student_deleted', $uid, $expected);
        notify_other_counselors($uid, 'Student account deleted', student_label($s) . " was permanently deleted by {$me['first_name']} {$me['last_name']}.", '🗑️', '/c/students');
        break;
    }

    // ---------- Superadmin: officers ----------
    case 'setOfficer': {
        $needSuper();
        $s = student_or_fail((string) ($in['id'] ?? ''));
        $position = str($in['position'] ?? '', 40);
        if ($position !== '' && !in_array($position, OFFICER_POSITIONS, true)) fail('Please choose a position from the list.', 400, ['field' => 'position']);
        if ($position === (string) $s['officer_position']) break;
        q('UPDATE users SET officer_position = ? WHERE id = ?', [$position ?: null, $s['id']]);
        log_event('officer_set', $uid, ($s['student_id'] ?: $s['email']) . ': ' . ($position ?: 'none'));
        if ($position) notify($s['id'], 'You’re now an officer', "The SMCBI Guidance Office named you $position. Your position now shows on your profile.", '🎓', '/s/profile');
        break;
    }

    // ---------- Superadmin: staff (admin) accounts ----------
    case 'createStaff': {
        $needSuper();
        $f = staff_fields($in, null);
        if ($err = check_password((string) ($in['password'] ?? ''))) fail($err, 400, ['field' => 'password']);
        $id = uuid();
        q("INSERT INTO users (id, first_name, last_name, email, password_hash, role, title, is_super, email_verified, profile_complete, settings, created_at)
           VALUES (?, ?, ?, ?, ?, 'counselor', ?, 0, 1, 1, ?, ?)", [
            $id, $f['first'], $f['last'], $f['email'], password_hash((string) $in['password'], PASSWORD_DEFAULT), $f['title'], json_encode(default_settings()), now(),
        ]);
        log_event('staff_created', $uid, $f['email']);
        notify($id, 'Welcome to MindTrack', 'Your admin account is ready. Open Appointments to add the times you’re available, so students can book a session with you.', '🌱', '/c/appointments');
        $result = ['id' => $id];
        break;
    }

    case 'updateStaff': {
        $needSuper();
        $s = staff_or_fail((string) ($in['id'] ?? ''));
        $f = staff_fields($in, $s['id']);
        $password = (string) ($in['password'] ?? '');
        if ($password !== '' && ($err = check_password($password))) fail($err, 400, ['field' => 'password']);
        q('UPDATE users SET first_name = ?, last_name = ?, email = ?, title = ? WHERE id = ?', [$f['first'], $f['last'], $f['email'], $f['title'], $s['id']]);
        if ($password !== '') q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($password, PASSWORD_DEFAULT), $s['id']]);
        log_event('staff_updated', $uid, $f['email']);
        break;
    }

    // Removing an admin archives the account: they can't sign in or be booked, but their past sessions stay
    // in students' and the office's records.
    case 'archiveStaff': {
        $needSuper();
        $s = staff_or_fail((string) ($in['id'] ?? ''));
        if ($s['id'] === $uid || !empty($s['is_super'])) fail('The superadmin account can’t be removed.', 400);
        if ($s['archived_at']) break;
        db()->beginTransaction();
        q('UPDATE users SET archived_at = ? WHERE id = ?', [now(), $s['id']]);
        $upcoming = rows("SELECT id, student_id, date, time FROM appointments WHERE counselor_id = ? AND status IN ('pending', 'confirmed') AND date >= ?", [$s['id'], today()]);
        foreach ($upcoming as $ap) {
            q("UPDATE appointments SET status = 'canceled', canceled_by = 'counselor' WHERE id = ?", [$ap['id']]);
            notify($ap['student_id'], 'Appointment canceled', 'Your session on ' . date('M j', strtotime($ap['date'])) . ' at ' . date('g:i A', strtotime($ap['time'])) . ' was canceled because the counselor is no longer available. Please book a new time.', '📅', '/s/appointments/book', 'appointment');
        }
        q('DELETE FROM availability_slots WHERE counselor_id = ? AND date >= ?', [$s['id'], today()]);
        db()->commit();
        log_event('staff_archived', $uid, $s['email']);
        break;
    }

    case 'restoreStaff': {
        $needSuper();
        $s = staff_or_fail((string) ($in['id'] ?? ''));
        q('UPDATE users SET archived_at = NULL WHERE id = ?', [$s['id']]);
        log_event('staff_restored', $uid, $s['email']);
        break;
    }

    // ---------- Counselor: Wellness Check questionnaires ----------
    // Answers are stored in question order, so a questionnaire's questions are locked once students have
    // answered it; counselors duplicate it to make a new, editable version.
    case 'saveSurvey': {
        $needSuper();
        $title = str($in['title'] ?? '', 120);
        if ($title === '') fail('Please give the questionnaire a title.');
        $description = str($in['description'] ?? '', 500);
        $id = is_string($in['id'] ?? null) ? $in['id'] : null;
        if ($id) {
            survey_or_fail($id);
            q('UPDATE surveys SET title = ?, description = ? WHERE id = ?', [$title, $description, $id]);
        } else {
            $id = uuid();
            q('INSERT INTO surveys (id, title, description, active, created_at) VALUES (?, ?, ?, 0, ?)', [$id, $title, $description, now()]);
        }
        $result = $id;
        break;
    }

    case 'duplicateSurvey': {
        $needSuper();
        $src = survey_or_fail((string) ($in['id'] ?? ''));
        $id = uuid();
        db()->beginTransaction();
        q('INSERT INTO surveys (id, title, description, active, created_at) VALUES (?, ?, ?, 0, ?)', [$id, mb_substr($src['title'] . ' (new version)', 0, 120), $src['description'], now()]);
        foreach (rows('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order', [$src['id']]) as $sq) {
            q('INSERT INTO survey_questions (id, survey_id, sort_order, question, question_type, scoring_rule, area, is_critical) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                uuid(), $id, $sq['sort_order'], $sq['question'], $sq['question_type'], $sq['scoring_rule'], $sq['area'], $sq['is_critical'],
            ]);
        }
        db()->commit();
        $result = $id;
        break;
    }

    case 'setActiveSurvey': {
        $needSuper();
        $id = is_string($in['id'] ?? null) && $in['id'] !== '' ? $in['id'] : null;
        if ($id) {
            survey_or_fail($id);
            $count = (int) val('SELECT COUNT(*) FROM survey_questions WHERE survey_id = ?', [$id]);
            if ($count < 3) fail('Add at least 3 questions before making this questionnaire active.');
        }
        // Only one questionnaire is offered to students at a time; null turns the Wellness Check off.
        $wasActive = $id && val('SELECT active FROM surveys WHERE id = ?', [$id]);
        q('UPDATE surveys SET active = (id = ?)', [$id ?? '']);
        if ($id && !$wasActive) {
            $title = val('SELECT title FROM surveys WHERE id = ?', [$id]);
            foreach (rows("SELECT id FROM users WHERE role = 'student' AND profile_complete = 1 AND archived_at IS NULL") as $st) {
                notify($st['id'], 'New Wellness Check available', "“{$title}” is ready. It takes a few minutes and helps you reflect on how you’ve been.", '📋', '/s/survey', 'survey');
            }
        }
        break;
    }

    case 'deleteSurvey': {
        $needSuper();
        $s = survey_or_fail((string) ($in['id'] ?? ''));
        if ($s['active']) fail('This questionnaire is active. Make another one active (or turn the Wellness Check off) first.');
        if (survey_responses($s['id'])) fail('Students have answered this questionnaire, so it is kept for their history.');
        q('DELETE FROM surveys WHERE id = ?', [$s['id']]);
        break;
    }

    case 'saveQuestion': {
        $needSuper();
        $question = str($in['question'] ?? '', 255);
        if ($question === '') fail('Please write the question.');
        $rule = ($in['scoring_rule'] ?? '') === 'negative' ? 'negative' : 'positive';
        $area = str($in['area'] ?? '', 60);
        $critical = empty($in['critical']) ? 0 : 1;
        $id = is_string($in['id'] ?? null) ? $in['id'] : null;
        if ($id) {
            $sq = row('SELECT * FROM survey_questions WHERE id = ?', [$id]);
            if (!$sq) fail('Question not found.', 404);
            survey_editable_or_fail($sq['survey_id']);
            q('UPDATE survey_questions SET question = ?, scoring_rule = ?, area = ?, is_critical = ? WHERE id = ?', [$question, $rule, $area ?: null, $critical, $id]);
        } else {
            $surveyId = (string) ($in['surveyId'] ?? '');
            survey_editable_or_fail($surveyId);
            if ((int) val('SELECT COUNT(*) FROM survey_questions WHERE survey_id = ?', [$surveyId]) >= 40) fail('A questionnaire can have up to 40 questions.');
            $next = (int) val('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM survey_questions WHERE survey_id = ?', [$surveyId]);
            $id = uuid();
            q("INSERT INTO survey_questions (id, survey_id, sort_order, question, question_type, scoring_rule, area, is_critical) VALUES (?, ?, ?, ?, 'frequency', ?, ?, ?)", [
                $id, $surveyId, $next, $question, $rule, $area ?: null, $critical,
            ]);
        }
        $result = $id;
        break;
    }

    case 'deleteQuestion': {
        $needSuper();
        $sq = row('SELECT * FROM survey_questions WHERE id = ?', [(string) ($in['id'] ?? '')]);
        if (!$sq) fail('Question not found.', 404);
        $s = survey_editable_or_fail($sq['survey_id']);
        if ($s['active'] && (int) val('SELECT COUNT(*) FROM survey_questions WHERE survey_id = ?', [$s['id']]) <= 3) {
            fail('An active questionnaire needs at least 3 questions.');
        }
        q('DELETE FROM survey_questions WHERE id = ?', [$sq['id']]);
        renumber_questions($sq['survey_id']);
        break;
    }

    case 'moveQuestion': {
        $needSuper();
        $sq = row('SELECT * FROM survey_questions WHERE id = ?', [(string) ($in['id'] ?? '')]);
        if (!$sq) fail('Question not found.', 404);
        survey_editable_or_fail($sq['survey_id']);
        $ids = q('SELECT id FROM survey_questions WHERE survey_id = ? ORDER BY sort_order', [$sq['survey_id']])->fetchAll(PDO::FETCH_COLUMN);
        $i = array_search($sq['id'], $ids, true);
        $j = $i + (($in['dir'] ?? '') === 'up' ? -1 : 1);
        if ($j >= 0 && $j < count($ids)) {
            [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]];
            foreach ($ids as $n => $qid) q('UPDATE survey_questions SET sort_order = ? WHERE id = ?', [$n + 1, $qid]);
        }
        break;
    }

    // ---------- Account ----------
    case 'updateSettings': {
        q('UPDATE users SET settings = ? WHERE id = ?', [json_encode(user_settings(json_encode($in['settings'] ?? null))), $uid]);
        break;
    }

    case 'completeProfile': {
        $need('student');
        if ($me['profile_complete']) fail('Your profile is already complete.');
        $sid = strtoupper(preg_replace('/[\s-]/', '', str($in['student_id'] ?? '', 20)));
        if (!preg_match(STUDENT_ID_PATTERN, $sid)) fail('Use your school Student ID: C24 followed by 4 digits, for example C243061.', 400, ['field' => 'student_id']);
        if (val('SELECT 1 FROM users WHERE student_id = ? AND id <> ?', [$sid, $uid])) {
            fail('This Student ID is already registered. Please contact the guidance office if this is a mistake.', 400, ['field' => 'student_id']);
        }
        $grade = $in['grade_level'] ?? '';
        if (!in_array($grade, YEAR_LEVELS, true)) fail('Please select your year level.', 400, ['field' => 'grade_level']);
        $section = strtoupper(str($in['section'] ?? '', 40));
        if ($section === '') fail('Please enter your section.', 400, ['field' => 'section']);
        $photo = is_string($in['photo'] ?? null) ? $in['photo'] : '';
        if ($photo !== '' && (!str_starts_with($photo, 'data:image/jpeg;base64,') || strlen($photo) > 300000)) fail('Please choose a smaller image.', 400, ['field' => 'photo']);
        q('UPDATE users SET student_id = ?, grade_level = ?, section = ?, photo = ?, profile_complete = 1 WHERE id = ?', [$sid, $grade, $section, $photo ?: null, $uid]);
        log_event('profile_completed', $uid);
        $new = row('SELECT * FROM users WHERE id = ?', [$uid]);
        notify_counselors('New student joined', student_label($new) . " · $grade · $section completed registration.", '👤', "/c/students/$uid", 'student');
        notify($uid, 'Welcome to MindTrack', 'Start by checking in with your mood today. Everything you share here is private by default.', '🌱', '/s/mood');
        break;
    }

    // ---------- Notifications ----------
    case 'markNotificationRead':
        q('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [(string) ($in['id'] ?? ''), $uid]);
        break;

    case 'markAllRead':
        q('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [$uid]);
        break;

    case 'deleteNotification':
        q('DELETE FROM notifications WHERE id = ? AND user_id = ?', [(string) ($in['id'] ?? ''), $uid]);
        break;

    // ---------- Access log (counselors viewing student data) ----------
    case 'logEvent': {
        $need('counselor');
        $type = $in['type'] ?? '';
        if (!in_array($type, ['student_profile_viewed', 'shared_journal_viewed'], true)) fail('Unknown event.');
        log_event($type, $uid, str($in['detail'] ?? '', 100));
        break;
    }

    default:
        fail('Unknown action.', 404);
}

// Tell other open pages that data changed; the caller learns the new marker so it doesn't reload twice.
$version = bump_version();
respond(['ok' => true, 'result' => $result, 'v' => $version, 'db' => snapshot(row('SELECT * FROM users WHERE id = ?', [$uid]))]);
