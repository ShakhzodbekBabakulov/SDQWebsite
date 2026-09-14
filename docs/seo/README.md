# SDQ SEO deliverables

- [Downloadable sitemap](sitemap.xml) — 35 canonical URLs, generated from the same catalog as the Next.js pages.
- [Search Console submission guide](search-console-guide.md) — publish first, then submit **https://sdq-sfb.com/sitemap.xml**.
- [Final keyword and metadata map](keyword-map.md) — Russian/English company pages and Uzbek train metadata.
- [Design, validation and release report](validation.md) — implemented, verified and pending work.

The approved architecture uses one domain, `sdq-sfb.com`. The train remains at `/`; the rebuilt company pages live at `/more/`. No Joomla login is required. The former two-domain/Joomla administration handoff is superseded.

## Search and AI readiness

Company content, navigation, titles, descriptions, canonical URLs and JSON-LD are present in the initial HTML. Real translation pairs have reciprocal Russian/English alternates; eight Russian-only product pages do not claim English equivalents. The train's four display languages remain interactive, with Uzbek Latin metadata and one canonical homepage.

Search readiness uses ordinary crawlability and accurate content. Google specifies no special AI-search markup or extra AI text file: [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features). OpenAI distinguishes OAI-SearchBot for search from GPTBot for training: [OpenAI crawler guidance](https://developers.openai.com/api/docs/bots). The imported robots snapshot contained no explicit model-training opt-out; this build does not introduce or remove one. Hosting-level preferences still require an authenticated audit.

`npm run build` regenerates the sitemap, robots, redirects and keyword map. Run `python scripts/verify-export.py` and the browser checks before publishing. The train's animated canvas/video content still has an extraction limitation; readable company pages provide detailed service and product information.
