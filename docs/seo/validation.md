# SDQ rebuild: design, validation and release report

Date: 14 September 2026. Worktree: `D:\Codex\worktrees\a1e8\SDQWebsite`. Branch: `codex/update-site-for-google-search`. Base: merged main `6b8a42c`, including PR #5's R2 video-range fix and PR #6's deployment workflow.

## Completion status

| Area | Status |
| --- | --- |
| Next.js company rebuild | Implemented locally: 32 migrated pages plus two AI integration pages |
| Design repairs | Implemented and browser-checked; checklist below |
| Technical SEO and AI search preparation | Implemented; 35-page static sitemap validated |
| Cloudflare deployment | **Not performed by this task**; PR #6's merged workflow is incorporated; production credentials and release checks remain required |
| Branded domain | Public DNS and direct Cloudflare HTTPS checks work; this machine's default resolver remains stale |
| Search Console | **Not verified or submitted by this task**; no Google verification token or accepted submission recorded |
| Full train regression | Run, with Windows WebKit limitations still open; not an all-green release claim |

## Implementation

The train has its own root layout and unchanged player code, CSS rules, films, four languages and language-aware company links. The company site uses a separate root layout and stylesheet, a typed content catalog and shared server-rendered components. The only company client interaction is the accessible mobile drawer.

The 33 imported HTML files were replaced by 34 generated company routes: 32 originals and two approved custom AI/1C integration service pages. The `/more/ru/` alias is a redirect. Eight Russian-only product pages remain Russian. All original business text and prices were retained except the approved contact-wording corrections, the existing untranslated integration bullet translated into English, the `1:С` typo corrected, and placeholder social icon labels removed. A text-by-text source comparison found **no unexplained missing source content**.

The original navy/gold palette, heading accents and homepage gradient are retained. Artwork, fonts and licenses remain local. Intrinsic image dimensions reserve layout space; meaningful alternatives replace generic filenames and “Image”. Removed 55 obsolete Joomla, SP Page Builder, jQuery and template JS/CSS files after replacement verification. The historical inventory and import implementation are recoverable at `8b499d0`; the current editing model is documented in [company-pages.md](../company-pages.md).

SEO includes unique titles/descriptions, absolute branded-domain canonical/social URLs, 13 reciprocal Russian/English pairs, shared Organization/WebSite identity, WebPage/BreadcrumbList JSON-LD and applicable Service data. Product pages do not invent ratings, prices or credentials in schema. The sitemap includes 35 canonical URLs and excludes aliases. There are 70 explicit former-URL redirects; `/` remains the train.

## Design defect checklist

| Defect and reproduction | Repair | Verification |
| --- | --- | --- |
| Desktop header: reduce width until “Поддержка” and phone wrap | Single-row desktop layout; switch to mobile navigation below 1280px; unbroken phone | 1280/1440 desktop checks; 1024px mobile-menu breakpoint |
| Mobile drawer: open at 390px; text clips at left | Drawer bounded to the viewport, padded content and scrollable height | Chromium/Firefox/WebKit menu screenshots and bounding-box checks |
| Press Escape in open menu; it remains open | Native dialog plus Escape/close/backdrop dismissal | All three browser engines |
| Tab past the last mobile-menu link | Explicit forward/backward focus cycling and labelled controls | Focus remains inside; opener regains focus after close |
| Close menu after scrolling the page | Preserve/restore root overflow and exact page position | Physical-pointer test at scrollY 500 in all engines; excludes Playwright's own sticky-header auto-scroll |
| Services have no H1 or empty builder headings | One descriptive H1; normalized H2/H3 hierarchy; feature bullets are paragraphs | Complete initial-HTML crawl of every company page |
| “Leave an application” / “Fill out the form” but no form exists | Phone/email wording and actionable contact links | Text audit and navigation checks; no forms/backends added |
| Product overview names beginning “1C” initially treated as numeric stats | Separate service/product cards from numeric statistics | Full responsive matrix; long product names wrap at 320px |
| Generic image alternatives and layout movement while images load | Descriptive alternatives and intrinsic dimensions | Asset/HTML validation and screenshot review |
| Small inline contact/product links | At least 44px target height with visible keyboard focus | All visible links/buttons measured at 390px on every company page |
| Company pages inherit fixed train viewport/scroll handling | Independent root layouts and native document navigation | Company scrolls; returning to train restores fixed desktop viewport; browser Back restores company layout |
| Broken language links or fabricated product translations | Only real page counterparts are linked; Russian-only products have no language toggle | All-pairs reciprocity and cross-browser navigation checks |

Baseline: every original canonical company page captured at 390px and 1440px before replacement (64 screenshots). Rebuilt pages: every page reviewed and captured at those widths (68 screenshots), with automated checks at **320, 390, 768, 1024, 1280 and 1440px**, 768×390 landscape, and a 640×450 effective CSS viewport representing 1280×900 at 200% browser zoom. This is an automated reflow equivalent, not a claim of physical browser-zoom or real-device testing.

[Before/after homepage](design-review/homepage-before-after.jpg) and [repaired mobile menu](design-review/mobile-menu.png). Desktop review sheets cover every rebuilt page: [1](design-review/review-1.jpg), [2](design-review/review-2.jpg), [3](design-review/review-3.jpg), [4](design-review/review-4.jpg), [5](design-review/review-5.jpg). Full-resolution captures are in `.cache/design/baseline/` and `.cache/design/after/` in this worktree; the automated checks reproduce the latter.

## Validation results

- PR preparation recheck on source commit `d4da436` after merging main: **all 69 Chromium browser tests pass** against a fresh `wrangler pages dev` process with local R2 (3.8 minutes). This includes the full company matrix, train regression, mobile recovery, redirects and exact video ranges. Unit tests (41), lint, TypeScript, production build and the 35-page export audit also pass. Subsequent changes only update these review documents and remove trailing whitespace from the historical robots comments.
- **41 unit tests pass.** ESLint, TypeScript and production static export pass.
- `python scripts/verify-export.py` passes: **35 initial HTML documents**, 35 unique titles/descriptions, canonical/social URLs, language labels and reciprocal alternates, structured data, internal targets, sitemap XML and **56 rendering assets**, including CSS font dependencies.
- Company crawl passes with JavaScript disabled. No missing requested assets, external rendering dependencies, empty headings, skipped heading levels or stale form prompts were found.
- After restoring the original gold heading accents and gradient, the final five-test Chromium company run passed again, including all-page layout/touch checks, initial-HTML crawl, redirects, layout isolation and the mobile drawer. Screenshots were refreshed from that build.
- Company navigation, menus, contacts, real language switching and train/company layout isolation were exercised across Chromium, Firefox and WebKit. The final broad company run had 38 passes, six intentionally skipped duplicate crawls and one WebKit train-startup timeout. Its isolated rerun passed; all six focused navigation/menu rechecks passed. The full responsive and 44px target matrix passed.
- All **12 video-range browser tests pass** against `wrangler pages dev`, backed by local R2 objects: four movies × three browser projects. They check HEAD, exact first/middle/suffix byte ranges, ETags, 304 and 416 responses. Video-handler unit tests also pass. Video source and handler code were not changed.
- Full train/video run: **126 passes and nine failures** across 135 cases. Two canvas cases assumed decoding would advance within 350ms; the assertions now wait for actual progress, and all six cross-browser canvas reruns pass. Isolated reruns also passed the WebKit ambience and Partners scenarios. Five Windows WebKit cases remain unresolved: two narrow greeting-frame observations, two language-button stability scenarios, and a simulated failed-request interception scenario. Of three representative cases rerun against the unchanged live Pages site, greeting-fade sampling and language-button stability failed there too; the other greeting case passed. Do not infer that every unresolved case is a product defect or that all are proven harmless. Native Safari/iOS confirmation remains necessary.

Remaining traces are in `test-results/`, `.cache/results-webkit-isolated/`, `.cache/results-live-comparison/` and `.cache/results-company-final/`. These ignored artifacts are local diagnostics, not published website files.

## DNS and deployment evidence

The default Windows resolver returned `37.153.159.14` and `dns1.ahost.uz` / `dns2.ahost.uz`. Independent queries to 1.1.1.1 and 8.8.8.8 returned `earl.ns.cloudflare.com` / `nelci.ns.cloudflare.com` and Cloudflare addresses `104.21.75.19` / `172.67.166.125`. HTTPS requests to `sdq-sfb.com` using the public DNS answer returned **200** for `/` and `/more/`, and **206** for the first 1024 video bytes, with the expected ETag and total length. This establishes working public branded-domain routing for the existing deployment; it does **not** mean this rebuild is deployed. The machine's default DNS path still needs to refresh.

Cloudflare CLI authentication was absent. The default OAuth flow was rejected by automatic approval review because it requested unrelated write scopes. A narrower flow using Pages write plus account/user/domain read access was accepted and opened; it timed out awaiting user sign-in. No deployment or DNS mutation occurred.

At PR preparation, [PR #6](https://github.com/ShakhzodbekBabakulov/SDQWebsite/pull/6), “Publish verified website releases automatically from GitHub”, was confirmed merged. Fetched main `6b8a42c` was merged into this task's feature branch. The Playwright configuration conflict was resolved by retaining the workflow's local Cloudflare runtime mode and this task's support for an already-running explicit preview URL. Hosted checks now run `company-content.spec.ts` in place of the removed import test, and CI validates TypeScript and the exported sitemap. The other registered worktrees were inspected read-only and were clean; their branch-relative overlap was not uncommitted work and neither checkout was changed. No production deployment was performed.

## Search Console and remaining release steps

The delivered [sitemap.xml](sitemap.xml), `public/sitemap.xml` and `out/sitemap.xml` have the same SHA-256:

`8bcb5c98f2ed86421caa5cebdde525d69bd68f56a05edfe19ec9315e54dc9f95`

Publish the reviewed export, retain a rollback deployment, verify the branded build and hosting crawler policies, then follow the [submission guide](search-console-guide.md). Use the verified `sdq-sfb.com` property and submit **https://sdq-sfb.com/sitemap.xml**. No verified property, accepted sitemap submission or indexing request has been recorded in this task.

The robots file allows Googlebot, Bingbot and OAI-SearchBot to public pages and rendering assets. The previous robots snapshot had no explicit training-crawler preference; no new training opt-in or opt-out was added. Account-level bot rules/WAF settings were not audited. The train's animation-dependent narrative remains a search-extraction limitation; the detailed company content is server-rendered. Indexing, rankings and AI citations are not guaranteed.
