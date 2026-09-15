import videos from './video-manifest.mjs';

// Single ranges cover browser media requests. Unsupported range syntax is
// ignored (full 200 response), as permitted by HTTP; unsatisfiable ranges are 416.
export function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || '');
  if (!match || (!match[1] && !match[2])) return null;
  if (!match[1]) {
    const length = Math.min(Number(match[2]), size);
    return length > 0 ? { offset: size - length, length } : false;
  }
  const offset = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return offset >= size || end < offset ? false : { offset, length: end - offset + 1 };
}

function matches(value, etag, weak = false) {
  return (value || '').split(',').some(item => {
    const tag = item.trim();
    return tag === '*' || (weak ? tag.replace(/^W\//, '') : tag) === etag;
  });
}

export async function onRequest({ request, env, params, next }) {
  if (!Object.hasOwn(videos, params.file)) return next();
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const video = videos[params.file];
  const etag = `"${video.sha256}"`;
  const headers = new Headers({
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'ETag': etag,
    // The public URL stays stable; revalidate when a new deployment changes it.
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.headers.has('If-Match') && !matches(request.headers.get('If-Match'), etag)) {
    return new Response(null, { status: 412, headers });
  }
  if (matches(request.headers.get('If-None-Match'), etag, true)) {
    return new Response(null, { status: 304, headers });
  }
  const ifRange = request.headers.get('If-Range');
  const range = request.method === 'GET' && (!ifRange || ifRange === etag)
    ? parseRange(request.headers.get('Range'), video.size) : null;
  if (range === false) {
    headers.set('Content-Range', `bytes */${video.size}`);
    return new Response(null, { status: 416, headers });
  }
  if (request.method === 'HEAD') {
    headers.set('Content-Length', String(video.size));
    return new Response(null, { headers });
  }
  // R2 performs the ranged read; do not buffer or slice the video in a Worker.
  const object = await env.VIDEOS.get(video.key, range ? { range } : undefined);
  if (!object) return new Response('Video unavailable', { status: 404 });
  headers.set('Content-Length', String(range ? range.length : video.size));
  if (range) headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${video.size}`);
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
