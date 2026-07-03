# Instagram Carousel Formats

Six formats. Pick by the SHAPE of the topic. All slides render at **1080×1350**
(Instagram 4:5 portrait) via `carousel-routine/render.js`.

| Format | Use when | Slide arc |
|---|---|---|
| `LISTICLE` | "5 ways / 7 tools / 4 signs" | Hook → one item per slide → recap+CTA |
| `DATA_STORY` | stats-driven, no single brand | Hook stat → context → 3–4 data slides → takeaway |
| `HOT_TAKE` | contrarian opinion / myth-bust | Myth → why it's wrong → the real model → CTA |
| `HOW_THEY_DID_IT` | a case/example to learn from | Result → the moves → the lesson |
| `STORY_REVEAL` | curiosity, narrative arc | Tease → build → reveal → so-what |
| `FRAMEWORK` | a repeatable mental model | Name it → the steps → apply it |

## Slide count
6–8 slides. Slide 1 = hook (no answer revealed). Last slide = single CTA + handle.

## Hook styles (rotate — see hook log)
1. Number-led ("80% of jobs will...")
2. Contrarian ("Stop learning to code.")
3. Question ("What happens to writers in 2027?")
4. Callout ("If you're under 30, read this.")
5. Before/After ("2023 vs 2026")
6. Mistake ("The mistake killing your career")
7. Curiosity gap ("The skill nobody is talking about")
8. Stakes ("This costs you ₹X a month")
9. Promise ("Save 10 hours a week with this")
10. Story ("She quit. Then AI changed everything.")

Read `state/carousel-hook-log.json` before choosing. The most recent style is
banned; any style used 3+ times in the last 7 entries is banned.

## Design recipe (matches brand-kit.html)
- Background `#030712` (never white). Card `#0f172a`.
- Display font Space Grotesk 700; body Inter; emphasis word Instrument Serif italic in cyan `#38bdf8`.
- Cyan = the one key word/stat (max 1–2 per slide). Amber `#fbbf24` = urgency. Emerald `#10b981` = wins.
- Handle `@harshdecodeai` watermark in a corner of every slide.
- A swipe affordance ("→") on slides 1–(n-1).
