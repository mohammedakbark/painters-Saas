---
name: instagram
description: Create the day's Instagram content for the zero.byt page from the 30-day "coming soon" plan. Use /instagram reel [day] for one reel (script, beat sheet, shot list, cover PNG, caption) or /instagram post [day] for two 1080x1350 poster PNGs plus caption. Only states features the project docs confirm; nothing is posted automatically.
argument-hint: "<reel|post> [day 1-30]"
---

# /instagram — daily "coming soon" content

Arguments: `$ARGUMENTS`. The first word is the format, `reel` or `post`, and is required. If it's missing or anything else, ask which one. The second is an optional day number (1–30).

Paths are relative to the repository root:
- Settings: `marketing/instagram/brand.json`
- Calendar: `marketing/instagram/CONTENT_PLAN_30_DAYS.md`
- Output: `marketing/instagram/output/day-XX-<reel|post>/` (XX = two digits)
- Templates: `.claude/skills/instagram/templates/` · References: `.claude/skills/instagram/references/`
- Renderer: `node .claude/skills/instagram/scripts/render.mjs <html> <png> <width> <height>`

## 1. Pick the day

- If a day is given, use that row. If the row's format doesn't match the argument (e.g. `reel` on a Post day), say so and ask whether to follow the plan or override.
- If no day is given, use the first row whose status is `todo` and whose format matches.
- If that day's output folder already exists, ask before overwriting.

## 2. Gather facts (do not skip)

1. Read `brand.json` and the whole "Content rules" section of the calendar.
2. Read the doc section cited in the row's **Source** column (`docs/FEATURE_CATALOG.md`, `docs/PRODUCT_OVERVIEW.md`, a `docs/features/*.md` spec or a decision in `docs/DECISIONS_AND_OPEN_QUESTIONS.md`).
3. Write down, for yourself, the 2–4 facts the post will use, each with its source line. Anything without a source is cut.

## 3. Hard rules

- **No product name.** It doesn't exist yet (`productName: null`). Use "a new app for paint shops" / "the app". Credit only as **Powered by zero.byt**. The templates already carry the logo and handle.
- Everything is **coming soon**. There are no store links, "download now", dates, prices, "free", or user/shop counts.
- Credit = "approved by your shop". Shops never see each other's data. Painter incentives are never shown as a customer perk.
- Colours, font and logo come from the templates only. Don't add colours and don't recolour, stretch or redraw the zero.byt logo.
- Malayalam: one short, natural line per poster/caption. Mark it `⚠ native review` in `caption.md`.
- Never post or schedule anything. The output is for human review.

## 4a. `post` → two posters + caption

Make **poster A** and **poster B** from the row's A/B ideas. They may be a 2-slide carousel (set SLIDE to `1/2`, `2/2`) or two separate posts (SLIDE empty). Note which in `caption.md`.

For each poster:
1. Copy `templates/poster.html` to `output/day-XX-post/poster-a.html` (`poster-b.html`).
2. Fill the tokens:
   - KICKER: 1–3 words, e.g. `COMING SOON`, `FOR SHOPS`, `FOR PAINTERS`
   - HEADLINE: ≤ 7 words
   - SUBLINE: ≤ 18 words
   - POINT_1–3: optional, ≤ 6 words each; delete unused `<li>` or the `<ul>`
   - ML_LINE: one Malayalam line
   - CTA: from `brand.json` → `cta`
3. Use `<body class="dark">` for A and `<body class="light">` for B, unless contrast with the content argues otherwise.
4. Render: `node .claude/skills/instagram/scripts/render.mjs output/.../poster-a.html output/.../poster-a.png 1080 1350`.
5. **Look at the PNG** with Read. Check that no text overflows or overlaps the footer, the Malayalam renders (no boxes), the logo chip is crisp, and contrast is good. Shorten copy and re-render until it's clean.

## 4b. `reel` → script + cover + caption

Write `output/day-XX-reel/script.md` with:
1. **Hooks**: 3 options from `references/hooks.md`, each scored (Specific/Audience/Curiosity/Truth, 1–5), and the winner marked.
2. **Spec**: length 15–30 s, 9:16, captions on screen, suggested trending-style audio mood (no specific copyrighted track names required).
3. **Beat sheet** (timed table): `0–3 s` hook · `3–n s` 2–4 beats (problem → feature → outcome) · last 3 s CTA + "Powered by zero.byt" end card.
4. **Shot list**: per beat, what to film. Use screen recordings of **real implemented screens** (see `docs/PROJECT_STATE.md` for what exists: Shop App sign-in and catalogue, web shop profile/catalogue, the public home page) with fictional sample data (`pnpm --filter api catalogue:seed-sample`), plus simple phone-in-hand or shop-counter b-roll. For features not built yet, use text-on-screen or a simple animated card, never a fake UI.
5. **On-screen text** per beat (≤ 7 words) and **voice-over** in English with an optional Malayalam line.
6. **Cover**: copy `templates/reel-cover.html` to `output/day-XX-reel/cover.html`, fill KICKER/HOOK/ML_LINE, render at `1080 1920`, and inspect it as in 4a (text must stay inside the centre 1080×1350 safe zone).

## 5. Caption (both formats)

Write `output/day-XX-<format>/caption.md`:
```
# Day XX — <theme> (<Reel | Post ×2>)
## Caption
<hook line>

<3–5 short lines>

<Malayalam line>  ⚠ native review

<CTA>
Powered by @zero.byt

<10–15 hashtags from references/hashtags.md>

## Alt text
<one sentence per image>

## Sources
- <fact> — <doc path §section>

## Lint
<each failed check fixed; "all checks passed">
```
Then run every check in `references/caption-lint.md` and fix anything that fails.

## 6. Finish

1. In the calendar, set the row's status to `ready`.
2. Reply with: the files created (full paths), the winning hook, anything that needs human attention (Malayalam review, screens to record), and the next `todo` day.
