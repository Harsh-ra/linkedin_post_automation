#!/usr/bin/env node
/**
 * render-reel.mjs — render one Instagram Reel (1080x1920 MP4) from a props JSON.
 *
 * Usage: node render-reel.mjs <props.json> <output.mp4>
 *
 * The props JSON must match the ReelProps shape in src/reelData.ts:
 *   { "handle": "@harshdecodeai", "accent": "#38bdf8",
 *     "secondsPerScene": 2.6, "scenes": [ { "headline": "...", ... } ] }
 *
 * Remotion ships its own ffmpeg, so no system ffmpeg is required.
 */
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const propsPath = process.argv[2];
const outPath = process.argv[3];
if (!propsPath || !outPath) {
  console.error('Usage: node render-reel.mjs <props.json> <output.mp4>');
  process.exit(1);
}

const inputProps = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });

console.log('Bundling Remotion project...');
const serveUrl = await bundle({
  entryPoint: path.join(__dirname, 'src', 'index.ts'),
  // Use the system Chrome / puppeteer cache that the carousel renderer also relies on.
  onProgress: (p) => process.stdout.write(`\r  bundle ${p}%   `),
});
process.stdout.write('\n');

const composition = await selectComposition({ serveUrl, id: 'Reel', inputProps });

console.log(`Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps -> ${outPath}`);
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: outPath,
  inputProps,
  onProgress: ({ progress }) => process.stdout.write(`\r  render ${Math.round(progress * 100)}%   `),
});
process.stdout.write('\n');
console.log('Reel ->', outPath);
