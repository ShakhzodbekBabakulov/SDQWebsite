# SDQ Website roadmap

**Created** 2026-09-12 · **Last updated** 2026-09-14

## What this is

The one live list of what is not finished. It stays short: each item explains the gap and names the next action.

## Rules

1. Keep each item to a few lines and one **Action** line.
2. Update the item in the same commit as the work.
3. Close an item with its date and GitHub commit or pull request.

---

### SDQ-1 · Test and polish the mobile website

The phone foundation already exists. A real iPhone and Android walkthrough is still owed, plus the Firefox safe-area rounding and WebKit caption-timing checks found on 12 September.

**Action:** founder + Codex, next session

### SDQ-2 · Obtain Cloudflare and domain access — closed 2026-09-14

`sdq-sfb.com` is on Cloudflare nameservers. Deployment uses the founder's existing `wrangler login`. DNS edits were made with a temporary "Edit zone DNS" token that the founder should revoke in Cloudflare (My Profile, API Tokens). All previous hosting and email records were preserved; the mail record now points directly at the previous server (`37.153.159.14`) and the MX record at `mail.sdq-sfb.com`.

**Action:** none

### SDQ-3 · Publish through Cloudflare Pages — closed 2026-09-14

Static export enabled in commit `b6a0712`. Pages project `sdq-website` created by direct upload (not GitHub-connected, see README "Deploy"). `sdq-sfb.com` and `www.sdq-sfb.com` attached with HTTPS active. Verified: live page title, video and script files served, no console errors. Rollback: redeploy any earlier `<id>.sdq-website.pages.dev` build from the Cloudflare dashboard.

**Action:** none. Optional later: connect the Pages project to GitHub so pushes publish automatically.

### SDQ-4 · Enable website statistics

Turn on Cloudflare Web Analytics and confirm that a real visit appears in the dashboard.

**Action:** complete after the first production deployment

### SDQ-5 · Make the website discoverable on Google

The approved scope now uses one domain: `sdq-sfb.com`, with the train at `/` and rebuilt Next.js company pages at `/more/`. This task includes 32 migrated company pages, two new AI integration service pages, responsive design repairs, unique metadata, structured data, redirects and a 35-page sitemap. The earlier two-domain/Joomla administration proposal is superseded. See the [submission guide](../seo/README.md) and [validation report](../seo/validation.md).

**Action:** deploy the reviewed build after Cloudflare sign-in, verify branded-domain routing and hosting crawler settings, then verify the `sdq-sfb.com` Search Console property and submit `https://sdq-sfb.com/sitemap.xml`. Record accepted submission and processing status. Keep open until production and submission are verified; no Joomla login is needed.
