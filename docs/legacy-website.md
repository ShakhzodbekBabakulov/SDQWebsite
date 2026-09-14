# New homepage and existing Joomla website

The animated Next.js site remains the homepage. Its final contact action opens
the complete Joomla website on its current PHP hosting, in the same browser tab.
Joomla's files, database, forms and administrator remain on that host.

| Homepage language | Action | Destination |
| --- | --- | --- |
| Russian | Подробнее | `https://legacy.sdq-sfb.com/` |
| Uzbek Latin | Batafsil | `https://legacy.sdq-sfb.com/` |
| Uzbek Cyrillic | Батафсил | `https://legacy.sdq-sfb.com/` |
| English | See More | `https://legacy.sdq-sfb.com/en/` |

Joomla currently offers Russian and English. Both Uzbek choices use its Russian
homepage. Visible and mobile screen-reader links use the same locale mapping in
`src/components/train-story/captions.ts`.

## Hosting setup status — 2026-09-14

Created `legacy.sdq-sfb.com` in the existing Ahost cPanel account, sharing
`/home/sdqsfbco/public_html`. The Ahost nameservers (`dns1.ahost.uz`
and `dns2.ahost.uz`) return `37.153.159.14`, but that does not establish the
record in the Cloudflare DNS zone now documented on main. No website files or database were
moved or copied. The existing `test.sdq-sfb.com` is not used.

Scoped the existing `.htaccess` `/index.php` redirect to exclude the legacy
hostname. Otherwise that redirect would send visitors back to the animated
homepage after the main domain's cutover. The inserted condition is:

```apache
# SDQ: keep the existing Joomla entry point on the legacy hostname.
RewriteCond %{HTTP_HOST} !^legacy[.]sdq-sfb[.]com$ [NC]
```

It immediately precedes the existing `RewriteCond %{THE_REQUEST}` condition.
The previous file is saved outside the document root, with mode 0600, at
`/home/sdqsfbco/codex-sdq-export-20260914/htaccess-before-legacy-20260914-113621`.
To roll back only this operational change, restore that file to
`/home/sdqsfbco/public_html/.htaccess` after checking for subsequent edits.

Verified HTTP redirects for `/`, `/en/` and `/index.php` keep the legacy hostname
and upgrade to HTTPS. At the latest check (14 September, 12:05 UTC), HTTPS
requests using `--resolve legacy.sdq-sfb.com:443:37.153.159.14` and a browser
user agent returned HTTP 200 for both languages with the expected Joomla titles.
Certificate validation succeeded without a bypass. Plain curl requests received
Joomla's 403 response, so user-agent-dependent filtering should be considered
when diagnosing automated availability checks.

Public DNS remains blocked: both the local resolver and `1.1.1.1` report that
the legacy name does not exist. The latter returns `earl.ns.cloudflare.com` and
`nelci.ns.cloudflare.com` as the main domain's nameservers. The successful direct
host requests do not establish public browser availability.

### Remaining before publication

1. Recheck certificate validity through public DNS after the record is fixed.
   The earlier TLS failure no longer reproduces against Ahost directly. Account
   certificate management was unavailable in cPanel (`sslinstall`), so future
   renewal/setup changes may still require the hosting provider.
2. Main now documents the Cloudflare Pages launch and Cloudflare DNS. Verify
   `legacy.sdq-sfb.com` has an A record pointing to `37.153.159.14` in the active
   DNS zone, and preserve the current mail records. This task has not deployed
   these contact-link changes. Ahost's DNS record alone is insufficient after
   the nameserver change.
3. Once the public hostname works, check Joomla's live-site, cookie-domain and HTTPS settings,
   redirects, canonical/language URLs and hard-coded internal links. The old
   site's navigation and language switcher must stay on `legacy.sdq-sfb.com`.
   Avoid introducing a redirect from the new homepage back to Joomla.
   In the recovery copy, `live_site`, `cookie_domain` and `cookie_path` are empty.
   Check the live settings before changing anything.
4. Verify both destination pages, mobile menus, internal navigation, assets and
   the administrator login. Verify forms with the owner before sending a real
   enquiry. Browser tests in this repository intercept the destination and do
   not prove that the Joomla backend is configured or that email is delivered.
5. Only publish these contact-link changes after the legacy destination passes these checks.

## Local verification

While the legacy DNS record is pending, the local development preview can open
the existing Joomla site if the main hostname still reaches Ahost locally.
This temporary address stops being a Joomla preview once local DNS reaches the
new Cloudflare homepage. In PowerShell:

```powershell
$env:NEXT_PUBLIC_SDQ_PREVIEW_LEGACY_ORIGIN = "https://sdq-sfb.com"
npm run dev -- --hostname 127.0.0.1 --port 3100
```

This override applies only to `next dev`. Production builds ignore it and always
use `https://legacy.sdq-sfb.com/`, preventing a local preview setting from creating
a homepage loop at deployment. It does not resolve the legacy DNS blocker.
No credentials or private database files are needed for the preview.

Run `npm test`, `npm run lint`, `npm run build`, then
`npm run test:e2e -- tests/e2e/legacy-navigation.spec.ts`.
The navigation tests cover keyboard activation, desktop/mobile layouts, all four
languages and the mobile screen-reader destination. The existing scene-six test
also checks the language switcher and unchanged phone/email actions.

Verified in this worktree on 2026-09-14: 35 unit tests, ESLint and the production
static export passed. The full Chromium run passed 56 of 58 cases, including all
eight new navigation cases and the scene-six contact/language-switcher case.
Two existing wheel-input tests sent events 220–450 ms apart on Windows, beyond
the 180 ms gesture idle timeout, and unintentionally advanced extra chapters.
The translation test now sends one native wheel action; the continuous-gesture
test schedules synthetic wheel events inside the page and asserts their maximum
gap and default prevention. Both corrected cases passed on a focused rerun.
All 58 cases therefore passed across those runs; this is not a single green full
run. Firefox, WebKit and physical-device checks were not rerun for this change.
`npm start` and Playwright now serve `out/` with a static server that supports
video range requests, matching the Cloudflare export rather than `next start`.
The destination was intercepted in the navigation tests. Authoritative DNS and
HTTP redirects have since been checked on the hosting server, and direct-host
TLS requests pass. Public DNS and live browser navigation/form delivery remain
release gates.

The development-only override was also verified by clicking the Russian
«Подробнее» in the actual local browser: it opened the existing Joomla homepage
at `https://sdq-sfb.com/` with the expected content. A production build made with
that same preview variable still passed all 9 browser tests for the separate
`legacy.sdq-sfb.com` destination. No enquiries were submitted.

The recovered Joomla archive and database remain outside Git in the private
recovery folder. They are not Next.js assets and must not be placed in `public/`.
