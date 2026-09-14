# Publish and submit the SDQ sitemap

The file is [sitemap.xml](sitemap.xml). It contains 35 canonical pages on **https://sdq-sfb.com/**: the train, 32 migrated company pages and two AI integration services. It is byte-for-byte identical to `public/sitemap.xml` and `out/sitemap.xml`.

**Submission URL: https://sdq-sfb.com/sitemap.xml**

Google Search Console accepts the published URL, not a local file upload. Keep the file with the website export; do not submit the former Joomla sitemap or a separate Pages-hostname sitemap. See [Google's sitemap instructions](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Before submission

1. Reconcile overlapping deployment PR #6 and record the current production deployment ID for rollback. Build the reviewed revision, retaining any existing Google verification token.
2. Deploy to the existing `sdq-website` Pages project with its Functions directory and `wrangler.jsonc`. Preserve the R2 binding and old video objects. Verify every video manifest object exists before publishing.
3. Confirm `sdq-sfb.com` serves this build over HTTPS. Public DNS currently points to Cloudflare, while this machine's default resolver still returns the former origin. Do not declare the new release live based only on a working `pages.dev` preview. Preserve mail/MX records.
4. Open the sitemap URL on the branded domain. It must return HTTP 200 with the 35 expected URLs. Run the live crawl, redirects and video-range checks. Verify Cloudflare does not challenge or block Googlebot, Bingbot or OAI-SearchBot; retain existing model-training preferences.

## Verify ownership

Use the **Domain property `sdq-sfb.com`** when DNS access is available. In Search Console, choose Add property → Domain, enter `sdq-sfb.com`, and add the exact TXT record Google provides to the authoritative DNS provider. Leave it in place.

Alternatively, use the URL-prefix property **`https://sdq-sfb.com/`**. Choose HTML tag verification and supply the actual token from Google's `content` attribute as the build environment variable `GOOGLE_SITE_VERIFICATION`. Rebuild and publish, then click Verify. Preserve the token for future builds. No token has been invented or included in this export. If using Google's HTML-file method instead, upload the exact file Google supplies to the site's root and retain it.

## Submit and monitor

1. Select the verified property.
2. Open **Sitemaps**, submit `https://sdq-sfb.com/sitemap.xml`, and record the response and date. An accepted sitemap may still be processing.
3. Use **URL inspection** for `/`, `/more/`, priority Russian services, `/more/1c-cloud/`, `/more/podderzhka/` and the new AI service. Test the live URL and request indexing when available. Repeat for the corresponding English pages as appropriate.
4. Check Page indexing and Search performance after Google processes the site. Submission does not guarantee indexing, rankings or AI citations.

Priority AI URLs:

- https://sdq-sfb.com/more/uslugi/iskusstvennyj-intellekt-1c/
- https://sdq-sfb.com/more/en/services/ai-1c-integration/

## Current status

The file and implementation are prepared locally. This task has **not deployed or submitted** them. Deployment access, domain routing, the overlapping PR and remaining WebKit validation are recorded in [validation.md](validation.md). Record ownership verification and accepted submission only after they happen.
