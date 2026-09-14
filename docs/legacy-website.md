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
and upgrade to HTTPS. The main site's Russian and English homepages still return
HTTP 200 with their expected titles. Certificate validation for the new hostname
fails; no certificate-validation bypass was used.

### Remaining before publication

1. Ahost must enable the account's SSL Host Installer (`sslinstall`) and AutoSSL,
   or issue/install the certificate for `legacy.sdq-sfb.com` themselves. The
   cPanel SSL/TLS Certificates page reports that the feature is unavailable.
   The read-only UAPI `SSL get_autossl_renewal_status` call also returned status 0:
   `You do not have the feature «sslinstall».` Certificate management is blocked
   by the hosting plan, not by the local website code.
2. Main now documents the Cloudflare Pages launch and Cloudflare DNS. Verify
   `legacy.sdq-sfb.com` has an A record pointing to `37.153.159.14` in the active
   DNS zone, and preserve the current mail records. This task has not deployed
   these contact-link changes. Ahost's DNS record alone is insufficient after
   the nameserver change.
3. Once HTTPS works, check Joomla's live-site, cookie-domain and HTTPS settings,
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

While the legacy certificate is pending, the local development preview can open
the existing Joomla site if the main hostname still reaches Ahost locally.
This temporary address stops being a Joomla preview once local DNS reaches the
new Cloudflare homepage. In PowerShell:

```powershell
$env:NEXT_PUBLIC_SDQ_PREVIEW_LEGACY_ORIGIN = "https://sdq-sfb.com"
npm run dev -- --hostname 127.0.0.1 --port 3100
```

This override applies only to `next dev`. Production builds ignore it and always
use `https://legacy.sdq-sfb.com/`, preventing a local preview setting from creating
a homepage loop at deployment. It does not resolve the legacy certificate blocker.
No credentials or private database files are needed for the preview.

Run `npm test`, `npm run lint`, `npm run build`, then
`npm run test:e2e -- tests/e2e/legacy-navigation.spec.ts`.
The navigation tests cover keyboard activation, desktop/mobile layouts, all four
languages and the mobile screen-reader destination. The existing scene-six test
also checks the language switcher and unchanged phone/email actions.

Verified in this worktree on 2026-09-14: 35 unit tests, ESLint and the production
build passed. Chromium passed all eight desktop/mobile locale navigation tests
and the existing scene-six contact/language-switcher test (9 browser tests).
The destination was intercepted in the navigation tests. Authoritative DNS and
HTTP redirects have since been checked on the hosting server; live TLS and Joomla
navigation/form delivery remain unverified until Ahost enables the certificate.

The development-only override was also verified by clicking the Russian
«Подробнее» in the actual local browser: it opened the existing Joomla homepage
at `https://sdq-sfb.com/` with the expected content. A production build made with
that same preview variable still passed all 9 browser tests for the separate
`legacy.sdq-sfb.com` destination. No enquiries were submitted.

The recovered Joomla archive and database remain outside Git in the private
recovery folder. They are not Next.js assets and must not be placed in `public/`.
