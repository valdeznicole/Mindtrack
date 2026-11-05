<?php
// Returns everything the signed-in user is allowed to see. Signed-out visitors get an empty snapshot.
declare(strict_types=1);

require __DIR__ . '/lib.php';

start_session();
$me = current_user();
// A session that just ended because the account was archived or deleted: tell the app why.
if (!$me && !empty($GLOBALS['session_end_reason'])) require_user();
respond(['ok' => true, 'db' => snapshot($me)]);
