import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import videos from '../../cloudflare/video-manifest.json' with { type: 'json' };

for (const [name, video] of Object.entries(videos)) {
  test(`video delivery preserves exact byte ranges for ${name}`, async ({ request }) => {
    const url = `/video/${name}`;
    const bytes = readFileSync(new URL(`../../public/video/${name}`, import.meta.url));
    const head = await request.head(url);
    expect(head.status()).toBe(200);
    expect(head.headers()['content-length']).toBe(String(video.size));
    expect(head.headers()['accept-ranges']).toBe('bytes');
    const etag = head.headers().etag;
    for (const [range, start, end] of [
      ['bytes=0-1023', 0, 1024],
      ['bytes=100000-101023', 100000, 101024],
      ['bytes=-1024', video.size - 1024, video.size],
    ] as const) {
      const response = await request.get(url, { headers: { Range: range } });
      expect(response.status()).toBe(206);
      expect(response.headers()['content-range']).toBe(`bytes ${start}-${end - 1}/${video.size}`);
      expect(await response.body()).toEqual(bytes.subarray(start, end));
    }
    const invalid = await request.get(url, { headers: { Range: `bytes=${video.size}-` } });
    expect(invalid.status()).toBe(416);
    const unchanged = await request.get(url, { headers: { 'If-None-Match': etag } });
    expect(unchanged.status()).toBe(304);
  });
}
