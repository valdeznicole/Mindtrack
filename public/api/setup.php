<?php
// Creates guidance counselor accounts. Counselors can't self-register, so an admin adds them here.
// Protected by SETUP_KEY in config.php. Set SETUP_KEY to '' (or delete this file) once your counselors exist.
declare(strict_types=1);

require __DIR__ . '/lib.php';

header('Content-Type: text/html; charset=utf-8');
$h = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES);

if (SETUP_KEY === '') {
    http_response_code(404);
    exit('Setup is disabled.');
}

$msg = '';
$ok = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $f = $_POST;
    $email = check_school_email($f['email'] ?? '');
    if (!hash_equals(SETUP_KEY, (string) ($f['key'] ?? ''))) {
        sleep(1);
        $msg = 'Wrong setup key.';
    } elseif (trim($f['first'] ?? '') === '' || trim($f['last'] ?? '') === '') {
        $msg = 'Enter the counselor’s first and last name.';
    } elseif (!$email['ok']) {
        $msg = $email['error'];
    } elseif ($err = check_password($f['password'] ?? '')) {
        $msg = $err;
    } elseif (val('SELECT 1 FROM users WHERE email = ?', [$email['email']])) {
        // An existing account (e.g. one that registered as a student) is promoted instead of duplicated.
        q("UPDATE users SET role = 'counselor', title = ?, email_verified = 1, profile_complete = 1, password_hash = ? WHERE email = ?", [
            str($f['title'] ?? '', 80) ?: 'Guidance Counselor', password_hash($f['password'], PASSWORD_DEFAULT), $email['email'],
        ]);
        log_event('counselor_promoted', null, $email['email']);
        bump_version();
        [$ok, $msg] = [true, "Existing account {$email['email']} is now a counselor."];
    } else {
        // The first counselor is the superadmin; later ones are admins (the superadmin can also add them in the app).
        $first = !val("SELECT 1 FROM users WHERE role = 'counselor' AND is_super = 1");
        q("INSERT INTO users (id, first_name, last_name, email, password_hash, role, title, is_super, email_verified, profile_complete, settings, created_at)
           VALUES (?, ?, ?, ?, ?, 'counselor', ?, ?, 1, 1, ?, ?)", [
            uuid(), str($f['first'], 80), str($f['last'], 80), $email['email'], password_hash($f['password'], PASSWORD_DEFAULT),
            str($f['title'] ?? '', 80) ?: 'Guidance Counselor', $first ? 1 : 0, json_encode(default_settings()), now(),
        ]);
        log_event('counselor_created', null, $email['email']);
        bump_version();
        [$ok, $msg] = [true, "Counselor account {$email['email']} created. They can log in now."];
    }
}
$counselors = rows("SELECT first_name, last_name, email, title FROM users WHERE role = 'counselor' ORDER BY created_at");
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>MindTrack · Add counselor</title>
  <style>
    body { font: 16px/1.5 system-ui, sans-serif; background: #F8FAF8; color: #1f2d27; margin: 0; padding: 24px 16px; }
    main { max-width: 440px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px #0001; }
    label { display: block; font-weight: 600; margin-top: 12px; font-size: 14px; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cfd8d3; border-radius: 10px; font: inherit; margin-top: 4px; }
    button { margin-top: 20px; width: 100%; padding: 12px; border: 0; border-radius: 10px; background: #3F7D5C; color: #fff; font: 600 16px system-ui; cursor: pointer; }
    .msg { padding: 10px 12px; border-radius: 10px; background: <?= $ok ? '#E4F0E8' : '#F8E7EC' ?>; }
    li { font-size: 14px; }
  </style>
</head>
<body>
<main>
  <h1>Add a guidance counselor</h1>
  <?php if ($msg): ?><p class="msg"><?= $h($msg) ?></p><?php endif; ?>
  <form method="post" autocomplete="off">
    <label>Setup key <input name="key" type="password" required></label>
    <label>First name <input name="first" required value="<?= $ok ? '' : $h($_POST['first'] ?? '') ?>"></label>
    <label>Last name <input name="last" required value="<?= $ok ? '' : $h($_POST['last'] ?? '') ?>"></label>
    <label>SMCBI email <input name="email" type="email" required placeholder="lastnamefirstname@<?= $h(SCHOOL_EMAIL_DOMAIN) ?>" value="<?= $ok ? '' : $h($_POST['email'] ?? '') ?>"></label>
    <label>Title <input name="title" placeholder="Guidance Counselor" value="<?= $ok ? '' : $h($_POST['title'] ?? '') ?>"></label>
    <label>Temporary password <input name="password" type="password" required minlength="8"></label>
    <button>Create counselor</button>
  </form>
  <h2>Current counselors</h2>
  <?php if (!$counselors): ?><p>None yet.</p><?php endif; ?>
  <ul>
    <?php foreach ($counselors as $c): ?>
      <li><?= $h("{$c['first_name']} {$c['last_name']}") ?> · <?= $h($c['email']) ?> · <?= $h($c['title']) ?></li>
    <?php endforeach; ?>
  </ul>
  <p style="font-size:14px;color:#667">When you're done, set <code>SETUP_KEY</code> to <code>''</code> in config.php to switch this page off.</p>
</main>
</body>
</html>
