---
name: instagram-reel-engine
description: Produce an animated-text Instagram Reel (1080x1920 MP4, 12-20s) plus its caption, by writing a scene JSON and rendering it through reel-routine (Remotion).
---

# Instagram Reel Engine (animated text/motion)

Renders a vertical MP4 from a JSON scene script via Remotion. No video footage,
no paid API — pure animated typography on the brand's dark canvas. Remotion ships
its own ffmpeg, so no system ffmpeg is required.

## Phase 1 — Pick the idea
One punchy idea that passes the `content-doctrine.md` topic filter. Reels reward
momentum: a hook, a 2–3 beat build, a payoff, a CTA. Avoid the topic of any
carousel/infographic in the same run (uniqueness across the whole batch).

## Phase 2 — Write the scene script
6–7 scenes. Each scene = 4–9 words. Apply `voice-profile.md` (no em-dashes, one
emphasis word). Write a props JSON matching `reel-routine/src/reelData.ts`:

```json
{
  "handle": "@harshdecodeai",
  "accent": "#38bdf8",
  "secondsPerScene": 2.6,
  "scenes": [
    {"kicker": "THE SHIFT", "headline": "AI won't take your job", "emphasis": "job"},
    {"headline": "Someone using AI will", "emphasis": "AI"},
    {"kicker": "01", "headline": "Automate the boring 80%"},
    {"kicker": "02", "headline": "Own the 20% only you can do"},
    {"headline": "That is your edge now", "emphasis": "edge"},
    {"headline": "Save this. Follow for more.", "sub": "@harshdecodeai"}
  ]
}
```
Save it to `output/<DATE>/reels/<slot>.props.json`. Keep total length 12–20s
(6 scenes × 2.6s ≈ 16s).

## Phase 3 — Render the MP4
```bash
cd reel-routine
node render-reel.mjs "../output/<DATE>/reels/<slot>.props.json" "../output/<DATE>/reels/<slot>.mp4"
```
First run only: `cd reel-routine && npm install`.

## Phase 4 — Write the caption
Caption follows `voice-profile.md` Instagram shape (hook line, body, one CTA,
8–15 hashtags). Save to `output/<DATE>/captions/<slot>.txt`.

## Phase 5 — Log
Append `{date, slot, idea, emphasis_word}` to `state/reel-hook-log.json`
(keep last 30) so reel ideas don't repeat across days.
