# SDQ Website roadmap

**Created** 2026-09-12 · **Last updated** 2026-09-12

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

### SDQ-2 · Obtain Cloudflare and domain access

The `sdq-sfb.com` domain currently uses aHost nameservers. Preserve every existing DNS and email record, then grant the minimum Cloudflare access and approve the private GitHub repository connection.

**Action:** founder grants access before hosting work begins

### SDQ-3 · Publish through Cloudflare Pages

Prepare the site as a static export, connect `main`, test the Cloudflare preview, and then attach `sdq-sfb.com`. Confirm HTTPS, desktop, mobile, and rollback before replacing the current site.

**Action:** start after SDQ-2

### SDQ-4 · Enable website statistics

Turn on Cloudflare Web Analytics and confirm that a real visit appears in the dashboard.

**Action:** complete after the first production deployment

### SDQ-5 · Make the website discoverable on Google

Add searchable company content, accurate metadata, robots instructions, a sitemap, and organization details. Verify the `sdq-sfb.com` domain in Google Search Console through Cloudflare DNS and submit the sitemap.

**Action:** complete after SDQ-3, then monitor indexing
