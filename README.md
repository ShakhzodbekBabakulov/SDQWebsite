# SDQ Website

Animated corporate website for SDQ Management Advisory Group, a consulting and official 1C partner in Uzbekistan.

The site presents SDQ through a six-carriage train journey. Each stop explains one part of the business: consulting, 1C implementation, partnerships, support, artificial intelligence, and contact.

## Experience

- Full-screen animated journey on desktop and mobile
- Mouse wheel, trackpad, keyboard, and vertical swipe navigation
- Uzbek Latin, Uzbek Cyrillic, Russian, and English
- Automatic language selection with a manual language switcher
- Reduced-motion support and keyboard-friendly controls
- Phone, email, and website actions in the final scene

## Controls

| Action | Control |
|---|---|
| Next or previous carriage | Scroll, trackpad, arrow keys, page keys, or vertical swipe |
| First or last carriage | Home or End |
| Pause or resume | P |
| Pause | Escape |

## Technology

| Area | Technology |
|---|---|
| Website | Next.js 16 and React 19 |
| Language | TypeScript |
| Browser testing | Playwright |
| Hosting | Cloudflare Pages, live at [sdq-sfb.com](https://sdq-sfb.com) |

## Run locally

Install Node.js and npm, then run:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To preview the production export, run `npm run build`, then `npm start`.
Browser tests start this static preview automatically; build before running them.

## Checks

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Playwright may require a one-time browser installation:

```bash
npx playwright install
```

## Deploy

The pages are published to the existing Cloudflare Pages project `sdq-website`. The four active movie files are served at their existing `/video/` URLs by a Pages Function backed by Cloudflare R2, which supports the partial downloads needed for seeking.

GitHub Actions automates publishing after a merge or push to `main`. Pull requests run checks without publishing or receiving Cloudflare credentials. The workflow runs unit tests, lint, the production build and the full Chromium suite against Cloudflare's local runtime. It saves the tested export together with its generated video manifest, then uploads the referenced movies and publishes a preview. Only after the preview's page, navigation and video checks pass does it publish that same build to production and check it again.

Open the repository's **Actions** tab to inspect each run, its source commit, preview and production links, or retained browser failure traces. A manual run publishes only when `main` is selected. Production releases are serialized; an outdated run skips publication when its commit no longer matches `main`.

### One-time credential setup

In the repository's **Settings → Secrets and variables → Actions**, configure:

- `CLOUDFLARE_ACCOUNT_ID`: the account containing `sdq-website`.
- `CLOUDFLARE_API_TOKEN`: a dedicated token with **Cloudflare Pages Edit** and **Workers R2 Storage Edit**, scoped to that account. The current Wrangler video uploader uses Cloudflare's REST API, so an R2 S3-only bucket token is not sufficient.

Keep the token in GitHub's encrypted secret store. Do not commit it or copy the interactive Wrangler login into automation. Deployment-email notifications are configured separately in Cloudflare; a successful GitHub run does not establish email delivery.

### Manual publishing and recovery

If automatic publishing is unavailable, a reviewed checkout can still be published from the project root:

```bash
npm run build
npm run upload:videos -- --remote
npx wrangler pages deploy out --branch main
```

Run these commands from the project root so Wrangler discovers `wrangler.jsonc` and `functions/`. Manual publishing uses the Cloudflare login stored by `wrangler login`. Uploading first ensures every referenced movie exists in the private `sdq-website-media` bucket. Each deployment has a permanent address of the form `https://<id>.sdq-website.pages.dev`; the production alias is `https://sdq-website.pages.dev`.

A failed preview blocks production. A failed check after production publishing marks the GitHub run as failed but does not automatically undo the release. Inspect the run and, when necessary, restore the last verified production deployment from Cloudflare's Pages dashboard. Existing content-hash video objects are retained for older deployments.

DNS for `sdq-sfb.com` is managed in Cloudflare. The bare domain and `www` point at the Pages project; the mail records point directly at the previous hosting server so email keeps working.

## Project map

```text
src/app/                         Page, metadata, and global styles
src/components/train-story/      Train journey, captions, controls, and video playback
public/video/                    Browser-ready desktop and mobile films
assets/                          Approved source artwork and working concepts
tests/                           Unit and browser checks
docs/                            Verification records and upcoming work
```

## Key documents

- [Project brief](PROJECT_BRIEF.md) — company story, content, and creative direction
- [Roadmap](docs/work/roadmap_260912.md) — the one live list of unfinished work
- [Browser verification](docs/verification/browser.md) — automated and manual browser coverage
- [Media verification](docs/verification/media.md) — source and exported video details
- [Existing website integration](docs/legacy-website.md) — public company pages at `/more/` and verification

## Current status

The site is live at [sdq-sfb.com](https://sdq-sfb.com) since 14 September 2026. The desktop and mobile foundations are implemented. The next work is real-phone polish, visitor statistics, and Google Search Console setup.
