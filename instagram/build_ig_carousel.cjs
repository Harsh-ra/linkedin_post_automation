#!/usr/bin/env node
// build_ig_carousel.cjs — render today's Instagram carousel (4:5, 1080x1350)
// reusing the LinkedIn branded-carousel templates + the day's carousel_data.json,
// so the Instagram carousel matches LinkedIn pixel-for-pixel (same theme/colors/fonts).
//
// Source of truth:
//   linkedin/carousel_data.json                       <- the day's slide copy (shared with LinkedIn)
//   linkedin/skills/branded-carousel/SKILL.md         <- TEMPLATE 1..7 HTML (the theme)
//
// Output:
//   output/<DATE>/instagram/carousel/slide-0N.png     <- 7 slides at 1080x1350
//
// Usage: node build_ig_carousel.cjs [YYYY-MM-DD]
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATE = process.argv[2] || new Date().toISOString().slice(0, 10);
const BRAND = '#5E6AD2';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LINKEDIN = process.env.LINKEDIN_DIR || path.join(ROOT, 'linkedin');
const dataPath = path.join(LINKEDIN, 'carousel_data.json');
const skillPath = path.join(LINKEDIN, 'skills', 'branded-carousel', 'SKILL.md');
const tempDir = path.join(ROOT, 'instagram', '.tmp', 'ig-carousel');
const outDir = path.join(ROOT, 'output', DATE, 'instagram', 'carousel');
// Reuse the LinkedIn run's downloaded photo assets if they exist, so images match too.
const liAssets = path.join(LINKEDIN, 'carousel-routine', 'temp', 'carousel-branded', 'assets');

function extract(content, marker) {
  const re = new RegExp(marker + '[\\s\\S]*?```html([\\s\\S]*?)```');
  const m = content.match(re);
  if (!m) throw new Error('template not found: ' + marker);
  return m[1];
}

function objMap(o) { const r = {}; for (const [k, v] of Object.entries(o)) r['{{' + k + '}}'] = v; return r; }

(async () => {
  const skill = fs.readFileSync(skillPath, 'utf8');
  const T = {
    t1: extract(skill, 'TEMPLATE 1'),
    t2: extract(skill, 'TEMPLATE 2 & 4'),
    t3: extract(skill, 'TEMPLATE 3 & 5'),
    t6: extract(skill, 'TEMPLATE 6'),
    t7: extract(skill, 'TEMPLATE 7'),
  };
  const slideTemplate = { 1: T.t1, 2: T.t2, 3: T.t3, 4: T.t2, 5: T.t3, 6: T.t6, 7: T.t7 };
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  try {
    if (fs.existsSync(liAssets)) fs.symlinkSync(liAssets, path.join(tempDir, 'assets'));
  } catch (_) { /* onerror handlers in the templates hide missing images */ }

  // 4:5 override: grow the canvas from 1080x1080 to 1080x1350. Header is top-anchored
  // and the bottom strip is bottom-anchored, so the extra 270px becomes airy mid-space.
  const fourFive = '\n<style>\n  html, body { height: 1350px !important; }\n</style>\n';

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
           '--disable-dev-shm-usage', '--use-mock-keychain', '--password-store=basic',
           '--disable-extensions', '--no-default-browser-check'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });

  for (let n = 1; n <= 7; n++) {
    let html = slideTemplate[n];
    const repl = Object.assign({ '{{BRAND_COLOR}}': BRAND, '{{SLIDE_NUM}}': String(n).padStart(2, '0') },
                               objMap(data[String(n)] || {}));
    for (const [k, v] of Object.entries(repl)) html = html.split(k).join(String(v));
    html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, '');
    html = html.replace('</head>', fourFive + '</head>');
    const htmlPath = path.join(tempDir, 'slide-0' + n + '.html');
    fs.writeFileSync(htmlPath, html);
    await page.goto('file://' + htmlPath, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    const png = path.join(outDir, 'slide-0' + n + '.png');
    await page.screenshot({ path: png });
    console.log('  rendered', png);
  }
  await browser.close();
  console.log('IG carousel ready:', outDir);
})().catch((e) => { console.error('IG CAROUSEL ERROR:', e.message); process.exit(1); });
