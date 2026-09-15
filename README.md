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
| Hosting | Cloudflare Pages project `sdqwebsite`, built by Cloudflare from GitHub `main`; canonical domain `https://sdq-sfb.com/` |

## Run locally

Install Node.js and npm, then run:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To preview the static export, run `npm run build`, then `npm start`.
For complete verification, use Wrangler so redirects and R2 video ranges behave as they do on Cloudflare:

```bash
npm run build
npm run upload:videos -- --local
npx wrangler pages dev out --port 3002
```

In another terminal, set `SDQ_PREVIEW_URL=http://127.0.0.1:3002` and run the browser tests. A plain static server does not validate the Cloudflare video Function or redirect rules.

## Checks

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
python scripts/verify-export.py
npm run test:e2e
```

Playwright may require a one-time browser installation:

```bash
npx playwright install
```

## Deploy

The pages are published by the Cloudflare Pages project `sdqwebsite`, which is connected to this GitHub repository. Cloudflare clones every push to `main`, runs `npm run build` with the Node version from `.node-version`, publishes the `out/` folder together with the `functions/` directory and the R2 binding from `wrangler.jsonc`, and serves the result at `https://sdqwebsite.pages.dev`, `https://sdq-sfb.com` and `https://www.sdq-sfb.com`. Other branches get preview deployments at `https://<branch>.sdqwebsite.pages.dev`. The four active movie files are served at their existing `/video/` URLs by a Pages Function backed by Cloudflare R2, which supports the partial downloads needed for seeking.

GitHub Actions does not publish pages. It runs the checks on every pull request and push (unit tests, lint, the production build, TypeScript, the export audit and the Chromium suite against Cloudflare's local runtime), and after a push to `main` it uploads the referenced movies to the private bucket so a changed video is stored before visitors ask for it. Cloudflare publishes `main` whether or not the GitHub checks pass, so merge only when a pull request's checks are green.

Open Cloudflare's **Workers & Pages → sdqwebsite** page to see each build, its source commit and log, and to retry or roll back a deployment. Open the repository's **Actions** tab for check results and retained browser failure traces.

Two build details matter for Cloudflare's build machines: the Node version comes from `.node-version` (Cloudflare's default is too old to import the TypeScript content files), and the Pages Function loads the movie list from the generated `cloudflare/video-manifest.mjs`, because Cloudflare packages Functions with an older bundler that rejects JSON import attributes.

### One-time credential setup

In the repository's **Settings → Secrets and variables → Actions**, configure:

- `CLOUDFLARE_ACCOUNT_ID`: the account containing `sdqwebsite`.
- `CLOUDFLARE_API_TOKEN`: a dedicated token with **Workers R2 Storage Edit**, scoped to that account, used only to upload movies. The Wrangler video uploader uses Cloudflare's REST API, so an R2 S3-only bucket token is not sufficient.

Keep the token in GitHub's encrypted secret store. Do not commit it or copy the interactive Wrangler login into automation. Cloudflare needs no secret from GitHub; it reads the repository through its GitHub App installation.

### Recovery

If a release breaks the live site, open the project in Cloudflare's dashboard, pick the last good deployment and choose **Rollback to this deployment**; or fix `main` and let Cloudflare build again. A failed Cloudflare build leaves the previous deployment live. Each deployment has a permanent address of the form `https://<id>.sdqwebsite.pages.dev`; the production alias is `https://sdqwebsite.pages.dev`.

If a movie is missing from storage, run `npm run upload:videos -- --remote` from the project root with the Cloudflare login stored by `wrangler login`; it verifies every source file against `cloudflare/video-manifest.json` before uploading to the private `sdq-website-media` bucket. Existing content-hash video objects are retained for older deployments.

The train homepage is `/`; Russian company pages are at `/more/`, with English equivalents at `/more/en/`. Both belong to the canonical domain `sdq-sfb.com`. The Pages hostname is the hosting address, not a second canonical website. After a release, verify the custom-domain routing on `sdq-sfb.com` and `www.sdq-sfb.com`, not only on the Pages hostname. Preserve email records (the `mail` and MX records point at the former mail server) and old R2 objects.

Search Console Domain verification uses Google's DNS TXT value. For URL-prefix verification, supply the actual `GOOGLE_SITE_VERIFICATION` token when building and retain it for later deployments. See [submission guide](docs/seo/README.md), [keyword map](docs/seo/keyword-map.md), and [validation report](docs/seo/validation.md). Google accepts the published sitemap URL, not a local XML upload.

## Project map

```text
src/app/(train)/                 Isolated train root layout and styles
src/app/(company)/more/          Statically generated company documents
src/content/                    Typed company content, AI services and route catalog
src/components/company/         Shared header, drawer, content templates and footer
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
- [Existing website integration](docs/company-pages.md) — public company pages at `/more/` and verification

## Current status

This worktree rebuilds the company pages in Next.js, adds the two AI integration services, repairs company navigation, and generates a 35-page sitemap. The train's language-aware “Подробнее” action opens `/more/` or `/more/en/`. Joomla administration is no longer needed. Implementation, production deployment and Search Console submission are tracked separately in the validation report; production and submission require account access. Real-device checks and visitor statistics remain separate roadmap items.
