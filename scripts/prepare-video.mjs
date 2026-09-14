import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { MEDIA } from '../src/components/train-story/timeline.ts';

const manifest = {};
for (const pathname of [...new Set(Object.values(MEDIA).flatMap(media => [media.forward, media.reverse]))].sort()) {
  const bytes = await readFile(new URL('../public' + pathname, import.meta.url));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  manifest[pathname.split('/').pop()] = { key: `${sha256}/${pathname.split('/').pop()}`, size: bytes.length, sha256 };
}
await mkdir(new URL('../cloudflare/', import.meta.url), { recursive: true });
await writeFile(new URL('../cloudflare/video-manifest.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(new URL('../public/_routes.json', import.meta.url), JSON.stringify({ version: 1, include: Object.keys(manifest).map(name => '/video/' + name), exclude: [] }, null, 2) + '\n');
