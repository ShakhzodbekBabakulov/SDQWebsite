import { mkdir, writeFile } from 'node:fs/promises';
import { absolute, canonicalPaths, pages } from '../src/content/site.ts';
import { siteMetadata } from '../src/app/site-metadata.ts';
const xml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  canonicalPaths.map(path => {
    const page = pages.find(page => page.path === path);
    const alternates = page?.counterpart ? [page, pages.find(other => other.path === page.counterpart)] : [];
    return `  <url><loc>${xml(absolute(path))}</loc>${alternates.map(other => `\n    <xhtml:link rel="alternate" hreflang="${other.language}" href="${xml(absolute(other.path))}"/>`).join('')}</url>`;
  }).join('\n') + '\n</urlset>\n';
await mkdir('docs/seo', { recursive: true });
await writeFile('public/sitemap.xml', sitemap);
await writeFile('docs/seo/sitemap.xml', sitemap);
// Neither imported robots.txt nor the train configuration declared a model-training opt-out.
// Keep that preference unchanged; hosting-level crawler settings need a separate account audit.
await writeFile('public/robots.txt', 'User-agent: *\nAllow: /\nDisallow: /administrator/\nDisallow: /installation/\nDisallow: /logs/\nDisallow: /tmp/\n\nSitemap: https://sdq-sfb.com/sitemap.xml\n');
const redirects = new Map([['/more/ru/', '/more/'], ['/more/ru', '/more/'], ['/ru/', '/more/'], ['/ru', '/more/']]);
for (const page of pages) {
  const old = page.path.slice('/more'.length);
  if (old !== '/') {
    redirects.set(old, page.path);
    redirects.set(old.replace(/\/$/, ''), page.path);
  }
}
await writeFile('public/_redirects', '# Former company URLs; the root remains the train homepage.\n' + [...redirects].map(([from, to]) => `${from} ${to} 301`).join('\n') + '\n');
await writeFile('docs/seo/keyword-map.md', '# Canonical keyword and metadata map\n\nPrimary domain: https://sdq-sfb.com. All company content is statically rendered.\n\n' +
  `## Train homepage\n\n- URL: https://sdq-sfb.com/\n- Language: Uzbek Latin metadata; four interactive display languages.\n- Topic: SDQ; O‘zbekistonda 1C joriy etish; 1C qo‘llab-quvvatlash; sun’iy intellekt.\n- Title: ${siteMetadata.title}\n- Description: ${siteMetadata.description}\n\n` +
  pages.map(page => `## ${page.label}\n\n- URL: ${absolute(page.path)}\n- Language: ${page.language}\n- Primary topic: ${page.primaryTopic}\n- Title: ${page.title}\n- Description: ${page.description}\n- Translation: ${page.counterpart ? absolute(page.counterpart) : 'None (Russian-only product page).'}\n`).join('\n'));
console.log(`Generated ${canonicalPaths.length} canonical sitemap entries and ${redirects.size} explicit redirects.`);
