---
name: daily-instagram-posts
description: Generate today's Instagram content batch (2 carousels + 1 infographic + 2 animated-text reels, each with a caption) and deliver everything to Slack for manual posting.
---

# Daily Instagram Content → Slack

Produce today's Instagram batch and deliver it to the Slack channel for manual
posting. Text captions go as individually-copyable messages; carousel slides,
the infographic PNG, and reel MP4s go as file uploads.

**Default batch (easy to change in STEP 5):** 2 carousels + 1 infographic + 2 reels.

```bash
DATE=$(date +%Y-%m-%d)
mkdir -p "output/$DATE/captions" "output/$DATE/carousels" "output/$DATE/reels"
```

---

## STEP 0 — Load the doctrine (governs every asset)
```bash
cat ./content-doctrine.md ./voice-profile.md
```
Every topic below must pass the topic filter (Reach, Stakes, Altitude, Edge) and
avoid the DROP list.

---

## STEP 1 — Fetch research
```bash
bash ./fetch_reddit.sh    # writes ./reddit_data.json (Apify)
```
If Apify fails, WebFetch these (`top.json?limit=25&t=week&raw_json=1`):
artificial, ChatGPT, singularity, Futurology, technology, OpenAI.

---

## STEP 2 — Select distinct topics (do before writing anything)
Pick **5 completely distinct subjects** — one per asset — from the research plus
one fresh dataset for the infographic (WebSearch a 2025–2026 stat with 6–10 data
points). Check `state/infographic-run-log.json` and never reuse an infographic
topic from the last 30 days. Print the selection:
```
1. CAROUSEL A   → [subject] — format: [FORMAT]
2. CAROUSEL B   → [subject] — format: [FORMAT]
3. INFOGRAPHIC  → [dataset]  — format: [FORMAT]
4. REEL A       → [subject]
5. REEL B       → [subject]
```
Zero-overlap check: no two assets share an industry, tool, or angle.

---

## STEP 3 — Build the 2 carousels
For each (`carousel-1`, `carousel-2`) run `./skills/instagram-carousel/SKILL.md`
end to end (pick format + non-banned hook, write slides, generate HTML, render):
```bash
node carousel-routine/render.js "$DATE" "carousel-1"
node carousel-routine/render.js "$DATE" "carousel-2"
mkdir -p output/$DATE/carousels/carousel-1 output/$DATE/carousels/carousel-2
cp carousel-routine/output/$DATE/carousel-1/slide-*.png output/$DATE/carousels/carousel-1/
cp carousel-routine/output/$DATE/carousel-2/slide-*.png output/$DATE/carousels/carousel-2/
```
Then write each caption via `./skills/instagram-caption/SKILL.md` to
`output/$DATE/captions/carousel-1.txt` and `carousel-2.txt`, and append the
carousel hook log.

---

## STEP 4 — Build the infographic
Generate `./instagram-infographic.html` (1080×1350, brand palette) for the chosen
dataset using `./skills/instagram-carousel/FORMATS.md` design recipe, then:
```bash
node carousel-routine/cap_infographic.js \
  ./instagram-infographic.html "output/$DATE/infographic.png"
```
Write its caption to `output/$DATE/captions/infographic.txt`. Append
`state/infographic-run-log.json` (keep last 30).

---

## STEP 5 — Build the 2 reels
For each (`reel-1`, `reel-2`) run `./skills/instagram-reel-engine/SKILL.md`:
write the scene props JSON, then render. **First run only:** `cd reel-routine && npm install && cd ..`.
```bash
cd reel-routine
node render-reel.mjs "../output/$DATE/reels/reel-1.props.json" "../output/$DATE/reels/reel-1.mp4"
node render-reel.mjs "../output/$DATE/reels/reel-2.props.json" "../output/$DATE/reels/reel-2.mp4"
cd ..
```
Write each caption to `output/$DATE/captions/reel-1.txt` / `reel-2.txt`. Append
`state/reel-hook-log.json`.

---

## STEP 6 — Write the delivery manifest
Write `output/$DATE/manifest.json` describing every item (see send_to_slack.py
header for the schema):
```json
{
  "date": "<DATE>",
  "items": [
    {"type":"carousel","title":"<hook>","caption_file":"captions/carousel-1.txt","slides_dir":"carousels/carousel-1"},
    {"type":"carousel","title":"<hook>","caption_file":"captions/carousel-2.txt","slides_dir":"carousels/carousel-2"},
    {"type":"infographic","title":"<stat>","caption_file":"captions/infographic.txt","image":"infographic.png"},
    {"type":"reel","title":"<idea>","caption_file":"captions/reel-1.txt","video":"reels/reel-1.mp4"},
    {"type":"reel","title":"<idea>","caption_file":"captions/reel-2.txt","video":"reels/reel-2.mp4"}
  ]
}
```

---

## STEP 7 — Deliver to Slack
```bash
python3 send_to_slack.py "$DATE"
```
Requires `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` in `./.env`.

---

## STEP 8 — Completion report
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Daily Instagram Content — <DATE>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Carousel 1 → Slack (N slides + caption)
✓ Carousel 2 → Slack (N slides + caption)
✓ Infographic → Slack (PNG + caption)
✓ Reel 1 → Slack (MP4 + caption)
✓ Reel 2 → Slack (MP4 + caption)
```
