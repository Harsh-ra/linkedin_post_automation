#!/usr/bin/env node
// make_ig_caption.cjs — build an Instagram caption for the day's carousel/reel from
// the SAME carousel_data.json (same topic as LinkedIn). Writes a ready-to-paste .txt.
//
// Output: output/<DATE>/instagram/caption.txt
// Usage:  node make_ig_caption.cjs [YYYY-MM-DD]
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATE = process.argv[2] || new Date().toISOString().slice(0, 10);
const LINKEDIN = process.env.LINKEDIN_DIR || path.join(ROOT, 'linkedin');
const HANDLE = '@harshdecodeai'; // Instagram handle (LinkedIn is @harshrajpathak)

const data = JSON.parse(fs.readFileSync(path.join(LINKEDIN, 'carousel_data.json'), 'utf8'));
const get = (n, k, d = '') => (data[String(n)] || {})[k] || d;
const join = (...p) => p.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

const hook = join(get(1, 'HOOK_PART_1'), get(1, 'HOOK_PART_2'), get(1, 'HOOK_EMPHASIS'));
const intro = get(1, 'SUBTITLE');
const beats = [2, 3, 4, 5, 6]
  .map((n) => get(n, 'BODY_TEXT') || get(n, 'SUBHEAD'))
  .filter(Boolean)
  .slice(0, 4)
  .map((b) => '• ' + b);
const lesson = get(6, 'SUBHEAD') || get(7, 'SUBHEAD') || '';

const hashtags = [
  '#AI', '#ArtificialIntelligence', '#ChatGPT', '#FutureOfWork', '#Tech',
  '#Innovation', '#MachineLearning', '#AItools', '#TechNews', '#DigitalTransformation',
].join(' ');

const caption = [
  hook,
  '',
  intro,
  '',
  beats.join('\n'),
  '',
  lesson,
  '',
  `Save this and follow ${HANDLE} for the signal on where AI is going.`,
  '',
  hashtags,
].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n').trim() + '\n';

const outDir = path.join(ROOT, 'output', DATE, 'instagram');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'caption.txt');
fs.writeFileSync(outPath, caption);
console.log('wrote', outPath, '(' + caption.length + ' chars)');
