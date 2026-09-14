import { expect, test } from '@playwright/test';
import inventory from '../../docs/more-inventory.json' with { type: 'json' };

// One complete Chromium crawl complements the focused cross-browser user flows.
test('every exported company page and asset loads without broken internal links', async ({ page, request, browserName, baseURL }) => {
  test.skip(browserName !== 'chromium', 'Full content crawl runs once; navigation runs in every browser.');
  test.setTimeout(180_000);
  const origin = new URL(baseURL!).origin;
  const errors: string[] = [];
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) errors.push('External asset: ' + request.url());
  });
  page.on('requestfailed', request => {
    errors.push(`${request.failure()?.errorText} ${request.url()}`);
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(origin) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  const targets = new Set([...inventory.pages.map(item => item.path), ...inventory.assets]);
  for (const asset of inventory.assets) {
    const response = await request.get(asset);
    expect(response.status(), asset).toBe(200);
    expect(response.headers()['content-type'], asset).not.toContain('text/html');
  }
  for (const item of inventory.pages) {
    const response = await page.goto(item.path);
    expect(response?.status(), item.path).toBe(200);
    await expect(page).toHaveTitle(item.title);
    await expect(page.locator('form')).toHaveCount(0);
    const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => (anchor as HTMLAnchorElement).href));
    for (const href of links) {
      const url = new URL(href);
      expect(url.hostname, item.path).not.toBe('legacy.sdq-sfb.com');
      if (url.origin === origin) expect(targets.has(decodeURI(url.pathname)), `${item.path} links to ${href}`).toBe(true);
    }
    await expect.poll(() => page.locator('img').evaluateAll(images => images.filter((image): image is HTMLImageElement => image instanceof HTMLImageElement).filter(image => image.offsetWidth > 0 && image.loading !== 'lazy' && (!image.complete || image.naturalWidth === 0)).map(image => image.src)), { message: item.path }).toEqual([]);
  }
  expect(errors).toEqual([]);
});
