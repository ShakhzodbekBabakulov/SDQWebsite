# Company pages at /more/

The animated homepage and the recovered public company website are exported
and published together to the existing Cloudflare Pages project `sdq-website`.
The public website does not require Joomla, PHP, a database or the previous host
at runtime. There is no visitor-facing legacy hostname or reverse proxy.

| Homepage language | Destination |
| --- | --- |
| Russian, Uzbek Latin, Uzbek Cyrillic | `/more/` |
| English | `/more/en/` |

All contact actions open in the same tab. Old-site menus and language switching
stay under `/more/`. The original language switcher opens the other language's
homepage. The `/more/ru/` alias is retained because the English navigation links
to it. Eight Russian product detail pages remain Russian when reached from the
English product list, matching the original site; no translations were invented.

## What was migrated

`public/more/` contains the public HTML, images, CSS, JavaScript and fonts.
`docs/more-inventory.json` lists all 33 recovered pages and 160 required assets,
including font licenses.
`node scripts/import-more.mjs` regenerates these files from the former public
origin, using the project's Playwright Chromium and curl. It requires access to
that host only when importing, never when building or serving the exported site.
Public response caching defaults to `/private/tmp/sdq-more-source`; set
`SDQ_IMPORT_CACHE` to a fresh temporary directory for a fresh recovery.

The importer parses HTML with the browser's native DOMParser without executing
source scripts, rewrites links/assets/metadata for `/more/`, and includes CSS font
and background dependencies. Existing Google Fonts are copied locally. Missing
obsolete SVG/EOT font fallbacks are removed; verified WOFF2/WOFF/TrueType formats
are preserved. Imported vendor assets are excluded from application ESLint; the
import script and application code are linted normally.

Enquiry forms are replaced with labelled phone/email contact links. Form scripts,
CSRF tokens and Joomla keepalive polling are removed. Administration, enquiries,
content editing, and database migration are outside this release. No enquiry was
submitted, and no private backup, PHP source or database was copied into public
assets. Updating content means editing/re-exporting pages and publishing again.

## Verification and release

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
Browser tests use `npm start` to serve the actual static `out/` directory.
Run the complete Chromium suite and the company-navigation tests in Firefox and
WebKit. The content crawl visits every inventoried page and asset, checks internal
links and images, and fails on browser errors or missing same-origin resources.
The navigation tests load actual company pages; no destination is intercepted.

Publish and verify a Cloudflare preview before merging PR #5. Merge the reviewed
revision, build merged main, and deploy `out/` to the existing Pages project.
GitHub pushes and merges do not publish automatically. Verify the live homepage,
`/more/`, `/more/en/`, nested routes, menus, language switching and contact links.
If live checks fail, roll back to the recorded prior Cloudflare deployment.

## Rollback checkpoint

Before this release, production was Cloudflare deployment
`7aa38b76-620a-43f3-8b30-07f05b554a6c` (source `7cd6677`), available at
https://7aa38b76.sdq-website.pages.dev. Restore that deployment from the Pages
dashboard if post-publication checks fail; it contains the previous homepage.

## Verified 2026-09-14

- 34 unit tests, ESLint, TypeScript and the production static build pass.
- One uninterrupted final Chromium run: 61/61 tests pass (2.7 minutes).
- Focused navigation: 30/30 across Chromium, Firefox and WebKit.
- All 33 public pages and 160 assets pass the content crawl, with no broken
  internal targets, missing images, page errors or external asset requests.
- Desktop, phone layout and opened mobile menu inspected in screenshots.
- Independent migration and testing reviews: no merge-blocking findings.
- Physical-device checks were not rerun for this migration.
