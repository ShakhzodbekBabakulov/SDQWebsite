import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import videos from '../cloudflare/video-manifest.json' with { type: 'json' };

const mode = process.argv[2];
if (!['--local', '--remote'].includes(mode)) throw new Error('Specify --local or --remote');
const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const bucket = config.r2_buckets.find(item => item.binding === 'VIDEOS').bucket_name;
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const files = [];
// Validate the entire manifest before uploading any object.
for (const [name, video] of Object.entries(videos)) {
  const file = fileURLToPath(new URL('../public/video/' + name, import.meta.url));
  const bytes = await readFile(file);
  if (bytes.length !== video.size || createHash('sha256').update(bytes).digest('hex') !== video.sha256) {
    throw new Error('Video manifest differs from source: run npm run build before uploading');
  }
  files.push({ file, key: video.key });
}
for (const { file, key } of files) {
  execFileSync(process.execPath, [wrangler, 'r2', 'object', 'put', `${bucket}/${key}`, '--file', file,
    '--content-type', 'video/mp4', '--cache-control', 'public, max-age=31536000, immutable', mode], { stdio: 'inherit' });
}
