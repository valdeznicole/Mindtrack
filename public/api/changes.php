<?php
// Polled every few seconds by open pages: returns the "last change" marker written by bump_version() in lib.php.
// Deliberately tiny: no database, no session. The marker is just a timestamp and reveals nothing.
header('Content-Type: application/json');
header('Cache-Control: no-store');
$v = @file_get_contents(__DIR__ . '/data/version');
echo json_encode(['ok' => true, 'v' => $v === false ? '0' : trim($v)]);
