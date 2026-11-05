// MindTrack service worker. It makes the site installable as an app and shows a friendly page when the
// phone is offline. Nothing is cached: pages, files and data always come from the server.
const OFFLINE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MindTrack is offline</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#163f36;color:#f6f4e7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center;padding:24px}
h1{font-size:1.5rem;margin:0 0 8px}p{margin:0 0 22px;color:#e5eee5;line-height:1.5}button{font:inherit;font-weight:700;padding:13px 26px;border:0;border-radius:999px;background:#b5dec6;color:#163f36}</style></head>
<body><main><h1>You’re offline</h1><p>MindTrack needs an internet connection.<br>Check your Wi-Fi or mobile data, then try again.</p><button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
