# Security notes

This is a static, local-first PWA. It has no account system, server database, payments, analytics, or remote API.

Implemented protections:

- Content Security Policy via meta tag:
  - same-origin scripts/styles/assets only
  - no object/embed content
  - no frames
  - no forms posting externally
  - no external network connections
- `referrer=no-referrer`
- JavaScript is kept in a separate same-origin file rather than inline script.
- Styles are kept in a separate same-origin CSS file.
- No camera, microphone, contacts, geolocation, clipboard, or notification permissions are requested.
- Workout data is stored only in browser localStorage.
- Pinch zoom is disabled by viewport policy and Safari gesture suppression, as explicitly requested.
- Double-tap zoom is also suppressed.
- Service worker caches only the static app assets for offline use.

Important limitations:

- localStorage is not app-level encrypted. Do not store highly sensitive medical information, passwords, payment data, API keys, or secrets.
- Clearing Safari/site data can erase the saved workout data.
- GitHub Pages hosts the app frontend publicly if the site is public. Frontend code can be inspected by anyone.
- A meta CSP helps, but HTTP response headers are stronger. If you later want stronger headers such as `frame-ancestors`, HSTS, X-Content-Type-Options, or Permissions-Policy, use hosting that supports custom response headers.
- Disabling zoom reduces accessibility. It is included because it was explicitly requested.
