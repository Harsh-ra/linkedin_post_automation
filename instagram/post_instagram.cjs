// post_instagram.cjs — drive instagram.com web "Create" flow over port 9223.
// Usage: node post_instagram.cjs <carousel_slides_dir> <caption_file> [--share]
// Without --share it stops at the final review screen (no publish) and screenshots.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const slidesDir = process.argv[2];
const captionFile = process.argv[3];
const DO_SHARE = process.argv.includes('--share');

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function shot(page, tag){ const f=`ig-step-${tag}.png`; await page.screenshot({path:f}); console.log('   shot:',f); }

// click an element whose visible text / aria-label matches re
async function clickByText(page, re, timeout=12000){
  const start=Date.now();
  while(Date.now()-start<timeout){
    const h = await page.evaluateHandle((src)=>{
      const rx=new RegExp(src,'i');
      const els=[...document.querySelectorAll('button,[role="button"],a,div[role="button"],svg[aria-label]')];
      for(const el of els){
        const t=(el.innerText||el.getAttribute('aria-label')||'').trim();
        const r=el.getBoundingClientRect();
        if(t && rx.test(t) && r.width>0 && r.height>0) return el.closest('button,[role="button"],a') || el;
      }
      return null;
    }, re.source||re);
    const el=h.asElement();
    if(el){ await el.click(); await el.dispose(); return true; }
    await h.dispose(); await sleep(400);
  }
  return false;
}

(async () => {
  const caption = fs.readFileSync(captionFile,'utf8').trim();
  const slides = fs.readdirSync(slidesDir).filter(f=>/\.png$/.test(f)).sort().map(f=>path.resolve(slidesDir,f));
  console.log('Slides:', slides.length, '| caption chars:', caption.length);

  const browser = await puppeteer.connect({ browserURL:'http://127.0.0.1:9223', defaultViewport:null });
  const pages = await browser.pages();
  let page = pages.find(p=>/instagram\.com/.test(p.url())) || pages[0];
  await page.bringToFront();
  if(!/instagram\.com/.test(page.url())){ await page.goto('https://www.instagram.com/',{waitUntil:'domcontentloaded'}); }
  await sleep(1500);

  console.log('1. Click New post'); 
  if(!await clickByText(page,/^New post$|^Create$/)){ console.log('   trying + icon'); await clickByText(page,/New post|Create/); }
  await sleep(1500); await shot(page,'1-after-newpost');
  // a submenu may offer Post vs Reel — choose Post for carousel
  await clickByText(page,/^Post$/, 3000);
  await sleep(1500);

  console.log('2. Upload slides via file input');
  const input = await page.$('input[type="file"]');
  if(!input){ console.log('   ❌ no file input found'); await shot(page,'2-nofileinput'); browser.disconnect(); process.exit(2); }
  await input.uploadFile(...slides);
  await sleep(3000); await shot(page,'2-after-upload');

  console.log('3. Advance crop -> Next');
  await clickByText(page,/^Next$/); await sleep(2000); await shot(page,'3-after-next1');
  console.log('4. Advance filters/edit -> Next');
  await clickByText(page,/^Next$/); await sleep(2000); await shot(page,'4-after-next2');

  console.log('5. Type caption');
  const cap = await page.$('[aria-label="Write a caption..."], textarea, [contenteditable="true"]');
  if(cap){ await cap.click(); await sleep(300); await page.keyboard.type(caption.slice(0,2000)); }
  else console.log('   ⚠️ caption field not found');
  await sleep(1500); await shot(page,'5-caption-ready-REVIEW');

  if(DO_SHARE){
    console.log('6. SHARING (publishing now)');
    await clickByText(page,/^Share$/); await sleep(6000); await shot(page,'6-after-share');
    console.log('   posted (verify in screenshot).');
  } else {
    console.log('STOPPED before Share. Review ig-step-5-caption-ready-REVIEW.png. Re-run with --share to publish.');
  }
  browser.disconnect();
})().catch(e=>{ console.error('POSTER ERROR:', e.message); process.exit(1); });
