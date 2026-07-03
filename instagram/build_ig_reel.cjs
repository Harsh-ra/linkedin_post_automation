#!/usr/bin/env node
// build_ig_reel.cjs — build today's Instagram reel (9:16, 1080x1920 MP4) from the
// SAME carousel_data.json LinkedIn uses, so the reel is on the same topic + theme.
//
// Derives animated-text scenes from the carousel slide copy, writes a props JSON,
// then renders it with reel-routine/render-reel.mjs (Remotion, bundles its own ffmpeg).
//
// Output:
//   output/<DATE>/instagram/reel.props.json
//   output/<DATE>/instagram/reel.mp4
//
// Usage: node build_ig_reel.cjs [YYYY-MM-DD]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATE = process.argv[2] || new Date().toISOString().slice(0, 10);
const ACCENT = '#5E6AD2';
const HANDLE = '@harshrajpathak';

const LINKEDIN = process.env.LINKEDIN_DIR || path.join(ROOT, 'linkedin');
const data = JSON.parse(fs.readFileSync(path.join(LINKEDIN, 'carousel_data.json'), 'utf8'));
const get = (n, k, d = '') => (data[String(n)] || {})[k] || d;
const join = (...parts) => parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

const scenes = [];
// 1) Hook scene from the cover slide
scenes.push({
  kicker: get(1, 'HEADER_LABEL'),
  headline: join(get(1, 'HOOK_PART_1'), get(1, 'HOOK_PART_2'), get(1, 'HOOK_EMPHASIS')),
  emphasis: get(1, 'HOOK_EMPHASIS') || undefined,
});
// 2..6) Body beats from each content slide's headline
for (const n of [2, 3, 4, 5, 6]) {
  const headline = join(get(n, 'HEADLINE_PART_1'), get(n, 'HEADLINE_PART_2'), get(n, 'HEADLINE_EMPHASIS'));
  if (!headline) continue;
  scenes.push({
    kicker: get(n, 'EYEBROW') || get(n, 'PILL_LABEL') || get(n, 'HEADER_LABEL') || undefined,
    headline,
    emphasis: get(n, 'HEADLINE_EMPHASIS') || undefined,
  });
}
// final) CTA from the lesson slide
scenes.push({
  headline: join(get(7, 'HEADLINE_PART_1'), get(7, 'HEADLINE_PART_2'), get(7, 'HEADLINE_EMPHASIS')) || 'Save this. Follow for more.',
  sub: 'Save this · Follow ' + HANDLE,
  emphasis: get(7, 'HEADLINE_EMPHASIS') || undefined,
});

const props = { handle: HANDLE, accent: ACCENT, secondsPerScene: 2.6, scenes };

const outDir = path.join(ROOT, 'output', DATE, 'instagram');
fs.mkdirSync(outDir, { recursive: true });
const propsPath = path.join(outDir, 'reel.props.json');
const mp4Path = path.join(outDir, 'reel.mp4');
fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
console.log('wrote', propsPath, '(' + scenes.length + ' scenes)');

const renderer = path.join(ROOT, 'instagram', 'reel-routine', 'render-reel.mjs');
console.log('rendering reel ->', mp4Path);
const r = spawnSync('node', [renderer, propsPath, mp4Path], { stdio: 'inherit' });
process.exit(r.status || 0);
