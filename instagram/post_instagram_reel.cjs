// post_instagram_reel.cjs — publish one Instagram Reel via the instagram.com web
// "Create" flow over Chrome remote port 9223 (the logged-in Instagram window).
// Usage: node post_instagram_reel.cjs <reel.mp4> <caption_file> [--share]
// Without --share it stops at the review screen (no publish) and screenshots.
// Best-effort: Instagram's web reel UI changes often; review screenshots if a step misses.
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const videoPath = process.argv[2];
const captionFile = process.argv[3];
const DO_SHARE = process.argv.includes('--share');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(page, tag) { const f = `ig-reel-${tag}.png`; await page.screenshot({ path: f }); console.log('   shot:', f); }

async function clickByText(page, re, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const h = await page.evaluateHandle((src) => {
      const rx = new RegExp(src, 'i');
      const els = [...document.querySelectorAll('button,[role="button"],a,div[role="button"],svg[aria-label]')];
      for (const el of els) {
        const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
        const r = el.getBoundingClientRect();
        if (t && rx.test(t) && r.width > 0 && r.height > 0) {
          const btn = el.closest('button,[role="button"],a') || el;
          if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') continue; // wait for it to enable
          return btn;
        }
      }
      return null;
    }, re.source || re);
    const el = h.asElement();
    if (el) { await el.click(); await el.dispose(); return true; }
    await h.dispose(); await sleep(400);
  }
  return false;
}

// Click ONLY the composer's header button (top-right of the dialog), e.g. "Next"
// or "Share". The page also renders other controls with the same accessible text
// — the reel preview's slide-navigation arrows (class _al46/_al47) and the feed's
// "Share" buttons behind the modal — which must be excluded, so we require the
// element to sit in the header region (top of the viewport).
async function clickHeaderButton(page, label, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const h = await page.evaluateHandle((lbl) => {
      const els = [...document.querySelectorAll('div[role="button"],button,a')];
      for (const el of els) {
        if ((el.innerText || '').trim() !== lbl) continue;
        if (/_al46|_al47/.test((el.className || '').toString())) continue; // slide-nav arrow
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.top > 200) continue;       // header region only
        return el;
      }
      return null;
    }, label);
    const el = h.asElement();
    if (el) { await el.click(); await el.dispose(); return true; }
    await h.dispose();
    await sleep(500);
  }
  return false;
}

(async () => {
  const caption = fs.readFileSync(captionFile, 'utf8').trim();
  if (!fs.existsSync(videoPath)) { console.error('reel mp4 missing:', videoPath); process.exit(2); }
  console.log('Reel:', videoPath, '| caption chars:', caption.length);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find((p) => /instagram\.com/.test(p.url())) || pages[0];
  await page.bringToFront();
  if (!/instagram\.com/.test(page.url())) await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
  await sleep(1500);

  console.log('1. Open Create (clearing any leftover composer first)');
  // The carousel post runs just before this in the SAME Chrome window. If its
  // editor is still open, clicking Create triggers a "Discard post?" prompt and
  // no file input ever appears. Clear any in-progress composer before starting.
  await page.keyboard.press('Escape'); await sleep(600);
  if (await clickByText(page, /^Discard$/, 2500)) { console.log('   discarded leftover composer'); await sleep(1500); }
  if (!await clickByText(page, /^New post$|^Create$/)) await clickByText(page, /New post|Create/);
  await sleep(1200);
  // If Create surfaced a "Discard post?" prompt anyway, discard and reopen once.
  if (await clickByText(page, /^Discard$/, 2500)) {
    console.log('   cleared in-progress post; reopening Create');
    await sleep(1500);
    if (!await clickByText(page, /^New post$|^Create$/)) await clickByText(page, /New post|Create/);
    await sleep(1200);
  }
  await shot(page, '1-create');
  // A submenu may offer Post vs Reel — choose Reel when present.
  await clickByText(page, /^Reel$/, 3000);
  await sleep(1200);

  console.log('2. Upload video');
  const input = await page.$('input[type="file"]');
  if (!input) { console.log('   no file input'); await shot(page, '2-nofileinput'); browser.disconnect(); process.exit(2); }
  await input.uploadFile(videoPath);
  await sleep(12000); await shot(page, '2-after-upload');   // video needs time to process

  console.log('3. Advance to the caption/share screen (click Next until it appears)');
  // For video, IG silently ignores a "Next" click while the reel is still
  // re-encoding, so a fixed "Next x2" can stay stuck on Crop. Instead, click Next
  // repeatedly until the caption field or the Share button actually shows up.
  let reached = false;
  for (let i = 0; i < 15 && !reached; i++) {
    reached = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button,[role="button"],div[role="button"]')];
      const hasShare = btns.some((e) => /^Share$/i.test((e.innerText || '').trim()));
      const hasCaption = !!document.querySelector('[aria-label="Write a caption..."], [contenteditable="true"]');
      return hasShare || hasCaption;
    });
    if (reached) break;
    await clickHeaderButton(page, 'Next', 8000);
    await sleep(3000);
  }
  await shot(page, '3-advanced');
  if (!reached) console.log('   ⚠️ never reached caption/share screen (still processing?)');

  console.log('4. Caption');
  const cap = await page.$('[aria-label="Write a caption..."], textarea, [contenteditable="true"]');
  if (cap) { await cap.click(); await sleep(300); await page.keyboard.type(caption.slice(0, 2200)); }
  else console.log('   caption field not found');
  await sleep(1500); await shot(page, '5-caption-REVIEW');

  if (DO_SHARE) {
    console.log('5. SHARING');
    // Share (like Next) can be ignored while the video finishes processing, and
    // only the header Share publishes — click it until the composer actually closes.
    let shared = false;
    for (let i = 0; i < 10 && !shared; i++) {
      await clickHeaderButton(page, 'Share', 6000);
      await sleep(4000);
      shared = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button,[role="button"],div[role="button"]')];
        const stillComposer = btns.some((e) => /^Share$/i.test((e.innerText || '').trim()));
        const banner = /has been shared|your post has been shared|reel shared/i.test(document.body.innerText || '');
        return banner || !stillComposer;
      });
    }
    await shot(page, '6-after-share');
    console.log(shared ? '   ✅ reel shared (composer closed).' : '   ⚠️ Share did not complete — verify manually.');
  } else {
    console.log('STOPPED before Share. Review ig-reel-5-caption-REVIEW.png. Re-run with --share to publish.');
  }
  browser.disconnect();
})().catch((e) => { console.error('REEL POSTER ERROR:', e.message); process.exit(1); });
