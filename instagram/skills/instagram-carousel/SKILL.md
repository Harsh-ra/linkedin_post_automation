---
name: instagram-carousel
description: Build a branded Instagram image carousel (6-8 slides, 1080x1350 PNGs) from a chosen topic and format, rendered via carousel-routine/render.js.
---

# Instagram Carousel Engine

Input: a CAROUSEL_TOPIC, a CHOSEN_FORMAT (see FORMATS.md), a CAROUSEL_HOOK_STYLE,
and a target slot, e.g. `carousel-1`.

## Phase 1 — Pick format + hook
Read `./skills/instagram-carousel/FORMATS.md`. Apply its decision tree to the topic.
Read `./state/carousel-hook-log.json` and exclude banned hook styles (most recent +
anything used 3+ times in last 7). Record CHOSEN_FORMAT and CAROUSEL_HOOK_STYLE.

## Phase 2 — Write slide copy
Follow `./voice-profile.md` and `./content-doctrine.md`. Produce 6–8 slides:
- Slide 1: hook only (6–8 words), no answer revealed, one emphasis word.
- Middle slides: max 2 sentences each, one idea per slide.
- Last slide: single CTA + `@harshdecodeai`.

## Phase 3 — Source images (optional but encouraged)
For brand/case topics, drop 1080×1350-friendly images into
`carousel-routine/temp/<slot>/assets/`. For abstract topics, use typographic
slides (no image needed). Never ship a broken `<img>`.

## Phase 4 — Generate slide HTML
Write one file per slide to `carousel-routine/temp/<slot>/slide-01.html` ...
`slide-0N.html`. Each is a standalone 1080×1350 document. Reuse the palette and
fonts from `carousel-routine/brand-kit.html`. Required per slide:
- `body { width:1080px; height:1350px; margin:0; background:#030712; }`
- Google Fonts link for Space Grotesk + Inter + Instrument Serif.
- Handle watermark; emphasis word in `<span>` styled Instrument Serif italic cyan.

## Phase 5 — Render to PNG
```bash
node carousel-routine/render.js "$(date +%Y-%m-%d)" "<slot>"
```
Output: `carousel-routine/output/<DATE>/<slot>/slide-*.png`. These PNGs are the
final artifact (no PDF — Instagram uploads images individually).

## Phase 6 — Stage for delivery + log
Copy the slides into the day's drop folder and append the hook log:
```bash
DATE=$(date +%Y-%m-%d)
mkdir -p "output/$DATE/carousels/<slot>"
cp carousel-routine/output/$DATE/<slot>/slide-*.png "output/$DATE/carousels/<slot>/"
```
Append `{date, slot, hook_style, hook_text, topic, format}` to
`state/carousel-hook-log.json` (keep last 30).
