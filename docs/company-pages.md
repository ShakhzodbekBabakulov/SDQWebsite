# Next.js company pages

The company website is rebuilt from the public source imported in merged PR #5 (`8b499d0`). The original inventory remains in `docs/more-inventory.json`: 33 HTML files (32 canonical pages plus the Russian homepage alias) and 160 assets. The original files and importer remain recoverable from Git at that commit. A local rollback copy is also in `.cache/original-more/`.

## Content and rendering

- `src/content/company-pages.ts` contains the migrated Russian and English content as typed sections, columns and semantic text blocks. Business facts, product descriptions and prices are preserved.
- `src/content/ai-services.ts` contains the two newly approved custom AI/1C integration services. It makes no finished-product or performance claims.
- `src/content/site.ts` defines canonical routes, translation pairs, navigation and shared company identity.
- `CompanyContent.tsx` renders reusable home, service and product layouts; `CompanyShell.tsx` provides the shared header, footer and contact panel. Only the mobile drawer uses client state.
- Every company page is statically exported through `/more/[[...slug]]`. Its root layout sets the actual Russian or English document language. The train has a separate root layout, preserving its viewport/scroll behaviour.

The original artwork, local fonts and licenses remain under `public/more/`. All 33 route-conflicting imported HTML files and 55 obsolete Joomla, SP Page Builder, jQuery and template JS/CSS files were removed after verifying replacement functionality. The old importer was retired to prevent it from overwriting the new routes. No PHP, CMS, database, contact backend or hidden keywords were added.

## Language navigation

| Current content | Destination |
| --- | --- |
| Train: Russian or either Uzbek script | `/more/` |
| Train: English | `/more/en/` |
| Paired company page | Its actual translated counterpart |
| Eight Russian-only products | Remain Russian; no invented translation or hreflang |

The English product overview still links to the original Russian product details. The header's language control is omitted on those unpaired pages.

## Build and release

`npm run build` generates `public/sitemap.xml`, `public/robots.txt`, `public/_redirects`, the deliverable sitemap and keyword map before Next.js exports the pages. The sitemap has 35 canonical entries. `/more/ru/` and former company URLs redirect explicitly; `/` remains the train.

The existing video manifest, Pages Function, R2 binding and content-hashed storage keys are preserved. Test with `npm run upload:videos -- --local` and `npx wrangler pages dev out --port 3002`, then set `SDQ_PREVIEW_URL` for Playwright. Do not substitute a plain static server for video-range or redirect checks.

Deployment uses the existing `sdq-website` project and `wrangler.jsonc` from the repository root. Before deploying, record the current production deployment for rollback. Do not remove old R2 objects. See [SEO and release report](seo/validation.md) for actual completion status.
