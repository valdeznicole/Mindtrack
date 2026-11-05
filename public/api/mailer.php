<?php
// Minimal SMTP client (STARTTLS or SSL + AUTH LOGIN). InfinityFree disables PHP mail(), so codes go out over SMTP.
// Emails are sent as HTML (with the MindTrack logo embedded, since image links to this host are blocked by its
// browser check) plus a plain-text version for mail apps that don't show HTML.
declare(strict_types=1);

function send_mail(string $to, string $subject, string $text, ?string $html = null): void
{
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $remote = (SMTP_SECURE === 'ssl' ? 'ssl://' : 'tcp://') . SMTP_HOST . ':' . SMTP_PORT;
    $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) throw new RuntimeException("SMTP connect failed: $errstr ($errno)");
    stream_set_timeout($fp, 15);

    $expect = function (?string $line, array $codes) use ($fp): void {
        if ($line !== null) fwrite($fp, $line . "\r\n");
        $reply = '';
        while (($l = fgets($fp, 515)) !== false) {
            $reply .= $l;
            if (strlen($l) < 4 || $l[3] === ' ') break;
        }
        if (!in_array((int) substr($reply, 0, 3), $codes, true)) {
            throw new RuntimeException('SMTP error: ' . trim($reply ?: 'no reply'));
        }
    };

    $host = parse_url(APP_URL, PHP_URL_HOST) ?: 'localhost';
    $ehlo = 'EHLO ' . $host;
    $expect(null, [220]);
    $expect($ehlo, [250]);
    if (SMTP_SECURE === 'tls') {
        $expect('STARTTLS', [220]);
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('SMTP TLS handshake failed');
        $expect($ehlo, [250]);
    }
    $expect('AUTH LOGIN', [334]);
    $expect(base64_encode(SMTP_USER), [334]);
    $expect(base64_encode(SMTP_PASS), [235]);
    $expect('MAIL FROM:<' . SMTP_FROM . '>', [250]);
    $expect('RCPT TO:<' . $to . '>', [250, 251]);
    $expect('DATA', [354]);

    $headers = [
        'Date: ' . date('r'),
        'From: =?UTF-8?B?' . base64_encode(SMTP_FROM_NAME) . '?= <' . SMTP_FROM . '>',
        'To: <' . $to . '>',
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $host . '>',
        'MIME-Version: 1.0',
    ];
    $part = fn(string $type, string $body) => "Content-Type: $type\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($body));
    if ($html === null) {
        $message = implode("\r\n", $headers) . "\r\n" . $part('text/plain; charset=UTF-8', $text);
    } else {
        // multipart/alternative: plain text, then multipart/related (HTML + embedded logo).
        $alt = 'alt_' . bin2hex(random_bytes(8));
        $rel = 'rel_' . bin2hex(random_bytes(8));
        $logo = @file_get_contents(__DIR__ . '/mail-logo.png');
        $related = "--$rel\r\n" . $part('text/html; charset=UTF-8', $html);
        if ($logo !== false) {
            $related .= "--$rel\r\nContent-Type: image/png; name=\"mindtrack.png\"\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <logo@mindtrack>\r\n"
                . "Content-Disposition: inline; filename=\"mindtrack.png\"\r\n\r\n" . chunk_split(base64_encode($logo));
        }
        $related .= "--$rel--\r\n";
        $message = implode("\r\n", $headers) . "\r\nContent-Type: multipart/alternative; boundary=\"$alt\"\r\n\r\n"
            . "--$alt\r\n" . $part('text/plain; charset=UTF-8', $text)
            . "--$alt\r\nContent-Type: multipart/related; boundary=\"$rel\"\r\n\r\n" . $related
            . "--$alt--\r\n";
    }
    // Base64 lines never start with ".", so no dot-stuffing is needed.
    $expect($message . '.', [250]);
    $expect('QUIT', [221]);
    fclose($fp);
}

// ---------- Branded email layout ----------
// Table-based with inline styles so it looks right in Gmail, Outlook and phone mail apps.
// $o: title, intro, code (6 digits, optional), note, button [label, url] (optional), footer (optional).
function mail_html(array $o): string
{
    $e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
    $sage = '#2E5E47';
    $codeCells = '';
    if (!empty($o['code'])) {
        foreach (str_split($o['code']) as $d) {
            $codeCells .= '<td style="padding:0 4px;"><div style="width:44px;height:56px;line-height:56px;border-radius:12px;background:#F2F8F4;border:2px solid #A7C8B5;'
                . 'font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:800;color:' . $sage . ';text-align:center;">' . $e($d) . '</div></td>';
        }
    }
    $code = $codeCells ? '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:22px auto 8px;"><tr>' . $codeCells . '</tr></table>' : '';
    $button = '';
    if (!empty($o['button'])) {
        [$label, $url] = $o['button'];
        $button = '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:22px auto 4px;"><tr><td style="border-radius:999px;background:' . $sage . ';">'
            . '<a href="' . $e($url) . '" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">'
            . $e($label) . '</a></td></tr></table>';
    }
    $note = !empty($o['note']) ? '<p style="margin:6px 0 0;text-align:center;font-size:13px;color:#6B7069;">' . $e($o['note']) . '</p>' : '';
    $footer = $e($o['footer'] ?? 'If you didn’t ask for this, you can safely ignore this email. Your account stays secure.');

    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . $e($o['title']) . '</title></head>'
        . '<body style="margin:0;padding:0;background:#EEF4F0;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF4F0;"><tr><td align="center" style="padding:28px 12px;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 10px 30px rgba(20,40,30,0.08);">'
        // Header band with soft decorative circles
        . '<tr><td bgcolor="#6EA893" style="background:#6EA893;background-image:linear-gradient(155deg,#5A9683 0%,#6EA893 50%,#8FC0AA 100%);padding:0;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
        . '<td style="padding:22px 26px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>'
        . '<td style="padding-right:12px;"><img src="cid:logo@mindtrack" width="44" height="44" alt="MindTrack" style="display:block;border-radius:12px;border:0;"></td>'
        . '<td style="font-family:Arial,Helvetica,sans-serif;"><div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">MindTrack</div>'
        . '<div style="font-size:12px;font-weight:700;color:#DDF1E6;letter-spacing:1.5px;text-transform:uppercase;">SMCBI Guidance Office</div></td>'
        . '</tr></table></td>'
        . '<td align="right" valign="top" style="padding:14px 18px 0 0;"><div style="width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,0.18);"></div>'
        . '<div style="width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.28);margin:-14px 46px 0 0;"></div></td>'
        . '</tr></table></td></tr>'
        // Body
        . '<tr><td style="padding:30px 30px 8px;font-family:Arial,Helvetica,sans-serif;color:#1F2A24;">'
        . '<h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;color:#1F2A24;">' . $e($o['title']) . '</h1>'
        . '<p style="margin:0;font-size:15px;line-height:1.6;color:#3C4640;">' . nl2br($e($o['intro'])) . '</p>'
        . $code . $note . $button
        . '</td></tr>'
        // Tip
        . '<tr><td style="padding:18px 30px 26px;font-family:Arial,Helvetica,sans-serif;">'
        . '<div style="background:#F6F3EA;border-radius:14px;padding:12px 16px;font-size:13px;line-height:1.5;color:#5E625A;">' . $footer . '</div>'
        . '</td></tr>'
        . '</table>'
        . '<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8A918C;">MindTrack · SMCBI Guidance Office · This is an automated message.</p>'
        . '</td></tr></table></body></html>';
}
