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

The site is published to Cloudflare Pages as a static export. The Pages project is `sdq-website`; it is not connected to GitHub, so pushing to `main` does not publish. To publish the current checkout:

```bash
npm run build
npx wrangler@latest pages deploy out --project-name sdq-website --branch main
```

Run the deploy command from a directory outside this project if the Cloudflare CLI tries to reconfigure the build. The deploy uses the Cloudflare login stored by `wrangler login`. Every deploy also gets a permanent preview address of the form `https://<id>.sdq-website.pages.dev`, and the latest one is always at `https://sdq-website.pages.dev`.

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
- [Existing website integration](docs/legacy-website.md) — contact links and Joomla hosting setup

## Current status

The site is live at [sdq-sfb.com](https://sdq-sfb.com) since 14 September 2026. The desktop and mobile foundations are implemented. The next work is real-phone polish, visitor statistics, and Google Search Console setup.
