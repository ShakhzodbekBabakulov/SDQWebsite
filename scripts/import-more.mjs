/** One-time public-page export. Requires curl and the project's Playwright Chromium. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const exec = promisify(execFile);
const origin = 'https://legacy.sdq-sfb.com';
const output = path.resolve('public/more');
const cache = process.env.SDQ_IMPORT_CACHE || '/private/tmp/sdq-more-source';
const pages = new Map();
const assets = new Set();
const fontStyles = new Map();
const sourceOverrides = new Map();
const doneAssets = new Set();
const pending = ['/', '/en/'];
const browser = await chromium.launch();
const parser = await browser.newPage();

async function get(url) {
  const key = Buffer.from(url).toString('base64url');
  const file = path.join(cache, key);
  try { return await readFile(file); } catch { /* First import of this public URL. */ }
  const { stdout } = await exec('curl', ['--fail', '--silent', '--show-error', '--location',
    '--max-redirs', '3', '--max-time', '45', '--resolve', 'legacy.sdq-sfb.com:443:37.153.159.14',
    '--user-agent', 'Mozilla/5.0', url], { encoding: 'buffer', maxBuffer: 30 * 1024 * 1024 });
  await mkdir(cache, { recursive: true });
  await writeFile(file, stdout);
  return stdout;
}
function localPath(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const file = path.resolve(output, '.' + pathname);
  if (!file.startsWith(output + path.sep)) throw new Error('Unsafe export path: ' + pathname);
  return file;
}
async function save(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}
function assetUrl(value, base) {
  if (!value || /^(data:|#|blob:)/i.test(value)) return null;
  let url = new URL(value, base);
  if (url.hostname === 'fonts.gstatic.com') {
    const remote = url.href;
    const name = createHash('sha256').update(remote).digest('hex').slice(0, 20) + path.extname(url.pathname);
    url = new URL('/fonts/' + name, origin);
    sourceOverrides.set(url.href, remote);
  }
  if (![new URL(origin).hostname, 'sdq-sfb.com', 'www.sdq-sfb.com'].includes(url.hostname)) return null;
  url.protocol = 'https:'; url.host = new URL(origin).host; url.hash = ''; url.search = '';
  if (!/\.(css|js|mjs|png|jpe?g|gif|webp|svg|ico|avif|woff2?|ttf|eot|otf|pdf|mp4|webm)$/i.test(url.pathname)) {
    throw new Error('Unexpected public asset: ' + url.href);
  }
  assets.add(url.href);
  return url;
}
function cssRewrite(css, base) {
  // The original template lists obsolete SVG/EOT fonts which return 404. WOFF2,
  // WOFF and TrueType remain available for the same font faces.
  css = css.replace(/src:\s*url\([^)]*\.eot[^)]*\);/gi, '')
    .replace(/url\([^)]*\.eot[^)]*\)\s*format\(["']embedded-opentype["']\),?/gi, '');
  css = css.replace(/,\s*url\([^)]*\)\s*format\(["']svg["']\)/gi, '');
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (full, quote, value) => {
    const url = assetUrl(value, base);
    return url ? `url("/more${url.pathname}${new URL(value, base).hash}")` : full;
  });
}
try {
  while (pending.length) {
    const route = pending.shift();
    if (pages.has(route)) continue;
    if (pages.size >= 100) throw new Error('Unexpectedly large page inventory');
    const html = (await get(origin + route)).toString();
    const result = await parser.evaluate(({ html, origin, route }) => {
      // DOMParser does not execute the old site's scripts while transforming it.
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const pageLinks = new Set();
      const resourceLinks = new Set();
      const fonts = [];
      const base = origin + route;
      const internal = (url) => ['legacy.sdq-sfb.com', 'sdq-sfb.com', 'www.sdq-sfb.com'].includes(url.hostname);
      const english = doc.documentElement.lang.startsWith('en');
      for (const form of doc.querySelectorAll('form')) {
        const contact = doc.createElement('div');
        contact.className = 'sdq-static-contact';
        contact.innerHTML = `<h3>${english ? 'Contact us' : 'Свяжитесь с нами'}</h3><p>${english ? 'Call or email us to discuss your project.' : 'Позвоните или напишите нам, чтобы обсудить ваш проект.'}</p><p><a href="tel:+998555889000">+998 55 588 90 00</a></p><p><a href="mailto:info@sdq-sfb.com">info@sdq-sfb.com</a></p>`;
        form.replaceWith(contact);
      }
      for (const script of doc.querySelectorAll('script')) {
        if (/keepalive|com_rsform/.test(script.src) || /RSFormPro|sppb_user_timezone/.test(script.textContent)) { script.remove(); continue; }
        if (script.classList.contains('joomla-script-options')) {
          const options = JSON.parse(script.textContent);
          delete options['csrf.token']; delete options['system.keepalive'];
          options['system.paths'] = { root: '/more', rootFull: 'https://sdq-sfb.com/more/', base: '/more', baseFull: 'https://sdq-sfb.com/more/' };
          script.textContent = JSON.stringify(options);
        }
      }
      for (const element of doc.querySelectorAll('[href], [src], [poster], [data-src], [data-bg]')) {
        for (const attr of ['href', 'src', 'poster', 'data-src', 'data-bg']) {
          const value = element.getAttribute(attr);
          if (!value || /^(#|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
          const url = new URL(value, base);
          if (element.tagName === 'LINK' && url.hostname === 'fonts.googleapis.com') {
            const family = url.searchParams.get('family').split(':')[0].toLowerCase();
            const file = '/fonts/' + family + '.css';
            fonts.push({ url: url.href, file });
            element.setAttribute(attr, '/more' + file);
            continue;
          }
          if (!internal(url)) continue;
          const isPage = (element.tagName === 'A' || element.tagName === 'LINK') && !/\.[a-z0-9]+$/i.test(url.pathname);
          if (isPage) {
            if (/\/(administrator|component)(\/|$)/.test(url.pathname) || url.search) throw new Error('Unresolved dynamic page: ' + value);
            const page = url.pathname.replace(/\/$/, '') + '/';
            pageLinks.add(page);
            const dest = '/more' + page + url.hash;
            element.setAttribute(attr, element.tagName === 'LINK' ? 'https://sdq-sfb.com' + dest : dest);
            if (element.tagName === 'A') element.removeAttribute('target');
          } else {
            url.host = new URL(origin).host; url.protocol = 'https:'; url.search = ''; url.hash = '';
            resourceLinks.add(url.href);
            element.setAttribute(attr, '/more' + url.pathname);
          }
        }
      }
      for (const meta of doc.querySelectorAll('meta[content]')) {
        const value = meta.getAttribute('content');
        if (!/^https?:/.test(value)) continue;
        const url = new URL(value);
        if (!internal(url)) continue;
        if (/\.(png|jpe?g|webp|svg)$/i.test(url.pathname)) {
          url.host = new URL(origin).host;
          resourceLinks.add(url.href);
          meta.setAttribute('content', 'https://sdq-sfb.com/more' + url.pathname);
        } else {
          meta.setAttribute('content', 'https://sdq-sfb.com/more' + url.pathname);
        }
      }
      for (const element of doc.querySelectorAll('[srcset]')) {
        element.setAttribute('srcset', element.getAttribute('srcset').split(',').map(entry => {
          const [value, descriptor] = entry.trim().split(/\s+/);
          const url = new URL(value, base);
          if (!internal(url)) return entry;
          url.host = new URL(origin).host; url.protocol = 'https:'; url.search = '';
          resourceLinks.add(url.href);
          return '/more' + url.pathname + (descriptor ? ' ' + descriptor : '');
        }).join(', '));
      }
      return { html: '<!doctype html>\n' + doc.documentElement.outerHTML + '\n',
        fonts, links: [...pageLinks], assets: [...resourceLinks], title: doc.title };
    }, { html, origin, route });
    for (const font of result.fonts) fontStyles.set(font.file, font.url);
    for (const url of result.assets) assetUrl(url, origin);
    // Background images occur in both style attributes and style elements.
    result.html = cssRewrite(result.html, origin + route);
    pages.set(route, { path: '/more' + route, title: result.title });
    await save(path.join(output, route, 'index.html'), result.html);
    pending.push(...result.links.filter(url => !pages.has(url)));
    console.log('PAGE', route, result.title);
  }
  for (const [file, url] of fontStyles) {
    const css = cssRewrite((await get(url)).toString(), url);
    await save(localPath(origin + file), css);
    doneAssets.add(origin + file);
    const family = path.basename(file, '.css');
    const license = origin + '/fonts/' + family + '-OFL.txt';
    sourceOverrides.set(license, 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + family + '/OFL.txt');
    assets.add(license);
  }
  while ([...assets].some(url => !doneAssets.has(url))) {
    const batch = [...assets].filter(url => !doneAssets.has(url)).slice(0, 8);
    await Promise.all(batch.map(async url => {
      let bytes = await get(sourceOverrides.get(url) || url);
      if (new URL(url).pathname.endsWith('.css')) bytes = cssRewrite(bytes.toString(), url);
      if (/\.m?js$/.test(new URL(url).pathname)) {
        const js = bytes.toString();
        for (const match of js.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)) assetUrl(match[1], url);
      }
      await save(localPath(url), bytes);
      doneAssets.add(url);
    }));
    console.log('ASSETS', doneAssets.size, '/', assets.size + fontStyles.size);
  }
  await save(path.resolve('docs/more-inventory.json'), JSON.stringify({
    source: 'Existing SDQ public website, recovered 2026-09-14',
    pages: [...pages.values()], assets: [...doneAssets].map(url => '/more' + new URL(url).pathname).sort(),
  }, null, 2) + '\n');
} finally { await browser.close(); }
