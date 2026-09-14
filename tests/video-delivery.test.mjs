import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { onRequest, parseRange } from '../cloudflare/video-handler.js';
import videos from '../cloudflare/video-manifest.json' with { type: 'json' };

const [name, video] = Object.entries(videos)[0];
const etag = `"${video.sha256}"`;
async function response(headers = {}, method = 'GET', file = name, get = async () => ({ body: new Uint8Array([1, 2, 3]) })) {
  return onRequest({ request: new Request(`https://sdq-sfb.com/video/${file}`, { method, headers }),
    params: { file }, env: { VIDEOS: { get } }, next: () => new Response('static') });
}
test('video manifest matches every deployed movie exactly', () => {
  assert.equal(Object.keys(videos).length, 4);
  for (const [file, metadata] of Object.entries(videos)) {
    const bytes = readFileSync(new URL('../public/video/' + file, import.meta.url));
    assert.equal(bytes.length, metadata.size);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.sha256);
  }
});
test('HTTP ranges support first, middle, open-ended, suffix and oversized ends', () => {
  for (const [value, expected] of [
    ['bytes=0-1', { offset: 0, length: 2 }], ['bytes=40-59', { offset: 40, length: 20 }],
    ['bytes=98-', { offset: 98, length: 2 }], ['bytes=-10', { offset: 90, length: 10 }],
    ['bytes=90-999', { offset: 90, length: 10 }], ['bytes=-999', { offset: 0, length: 100 }],
    ['bytes=100-', false], ['bytes=4-2', false], ['bytes=-0', false],
    ['items=0-1', null], ['bytes=0-1,5-6', null], ['bytes=-', null],
  ]) assert.deepEqual(parseRange(value, 100), expected, value);
});
test('partial response streams the native R2 range with correct headers', async () => {
  const res = await response({ Range: 'bytes=0-2' }, 'GET', name, async (key, options) => {
    assert.equal(key, video.key); assert.deepEqual(options, { range: { offset: 0, length: 3 } });
    return { body: new Uint8Array([1, 2, 3]) };
  });
  assert.equal(res.status, 206); assert.equal(res.headers.get('content-range'), `bytes 0-2/${video.size}`);
  assert.equal(res.headers.get('content-length'), '3'); assert.equal(res.headers.get('accept-ranges'), 'bytes');
  assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [1, 2, 3]);
});
test('HEAD, invalid ranges and conditional requests do not download a video', async () => {
  const noRead = () => { throw new Error('Unexpected storage read'); };
  for (const [headers, method, status] of [
    [{ Range: 'bytes=0-1' }, 'HEAD', 200], [{ Range: `bytes=${video.size}-` }, 'GET', 416],
    [{ 'If-None-Match': etag }, 'GET', 304], [{ 'If-None-Match': 'W/' + etag }, 'GET', 304],
    [{ 'If-Match': '"other"' }, 'GET', 412], [{}, 'POST', 405],
  ]) {
    const res = await response(headers, method, name, noRead); assert.equal(res.status, status);
    if (method === 'HEAD') assert.equal(res.headers.get('content-length'), String(video.size));
    if (status === 416) assert.equal(res.headers.get('content-range'), `bytes */${video.size}`);
    assert.equal(await res.text(), '');
  }
});
test('stale If-Range serves the full current representation', async () => {
  const res = await response({ Range: 'bytes=0-2', 'If-Range': '"old"' }, 'GET', name, async (_key, options) => {
    assert.equal(options, undefined); return { body: new Uint8Array([1]) };
  });
  assert.equal(res.status, 200); assert.equal(res.headers.get('content-range'), null);
});
test('missing storage objects fail visibly and unrelated files keep static serving', async () => {
  assert.equal((await response({}, 'GET', name, async () => null)).status, 404);
  assert.equal(await (await response({}, 'GET', 'poster.jpg')).text(), 'static');
});
