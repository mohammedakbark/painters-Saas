---
name: instagram
description: Create the day's Instagram content for the zero.byt page from the 30-day "coming soon" plan, in the approved ad styles (A app showcase, D bold typography, C problem → solution). Use /instagram reel [day] for one reel (script, beat sheet, shot list, cover PNG, caption) or /instagram post [day] for two 1080x1350 poster PNGs plus caption. Only states features the project docs confirm; nothing is posted automatically.
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
- Look and colours come from the three style templates only (A main, then D, then C; B "paint splash" was rejected). Don't invent a new style or add colours outside the style's palette in `brand.json` → `styles`.
- Logo: the transparent `../../assets/zerobyt-logo-light.png` (dark backgrounds) or `-dark.png` (light backgrounds), placed directly on the poster. **Never a white box**, never stretched or redrawn.
- **Lockup spec (do not change per poster):** the `.zb` block in each template. The logo is 56px tall. "Powered by" is Inter 21px at 72% white, sitting on the **baseline of "zero"**: the logo is shifted down 12px, which is its descender (936×233 image, baseline at 183px). The left edge is the poster margin (64px), and the bottom of the "y" sits 56px from the bottom. Style C uses the stacked variant, right-aligned. If you rebuild the logo with `scripts/logo-cut.mjs`, re-measure (it writes `logo-metrics.json`) and update the shift.
- **Check details at 2× zoom** before calling a poster done: logo baseline, margins, equal spacing, nothing touching an edge. The footer is the first place a viewer notices sloppiness.
- **English only.** No Malayalam on posters, covers, captions or voice-over.
- Don't claim where zero.byt is based ("Made for Kerala", not "Built in Kerala"). Use "availability", never "stock".
- Phone mockups show **fictional data** only (shop "Sree Colours, Thrissur", "Varma Paints, Kochi", site "Green Villa", painter "Rajesh", brands "Aurora Paints", "Kayal Coatings", shades "Kerala Teal AP 4021", "Sunset Ochre AP 2210"). Show only screens for confirmed features.
- Never post or schedule anything. The output is for human review.

## 4a. `post` → two posters + caption

The calendar's Format column gives the style of each poster, e.g. `Post ×2 (A+D)`: poster A in style A, poster B in style D. The two may be a 2-slide carousel or two separate posts; note which in `caption.md`.

Act as a senior graphic designer. These are ads, not slides: one big hero visual (the phone), a short bold headline, a few scannable points, and the tagline.

For each poster:
1. Copy the style template (`templates/style-a-showcase.html`, `style-d-typography.html` or `style-c-before-after.html`) to `output/day-XX-post/poster-a.html` (`poster-b.html`). The header comment in each template says what to change and what to keep.
2. Rewrite only the content for the day: badge, headline (≤ 7 words), short lines/cards, the **phone screen** (show the feature of the day: storefront, shades, site spend, bills, credit approved by your shop, rewards, find shops), and the tagline "Your shop, your painters, your customers. Connected." Keep layout, palette, fonts, decorations and footer (Powered by + logo + @zero.byt).
3. Render: `node .claude/skills/instagram/scripts/render.mjs output/.../poster-a.html output/.../poster-a.png 1080 1350` (fonts load from Google Fonts, so a network connection is needed).
4. **Look at the PNG** with Read and critique it like an art director: is the hierarchy clear in 2 seconds, is it legible on a phone, is anything clipped or overlapping, is the logo crisp with no box? Fix and re-render, **at least twice**, until it's ad-quality.
5. Reference: `output/day-01-post/` is the approved Day 1 (style A + D).

## 4b. `reel` → script + cover + caption

Write `output/day-XX-reel/script.md` with:
1. **Hooks**: 3 options from `references/hooks.md`, each scored (Specific/Audience/Curiosity/Truth, 1–5), and the winner marked.
2. **Spec**: length 15–30 s, 9:16, captions on screen, suggested trending-style audio mood (no specific copyrighted track names required).
3. **Beat sheet** (timed table): `0–3 s` hook · `3–n s` 2–4 beats (problem → feature → outcome) · last 3 s CTA + "Powered by zero.byt" end card.
4. **Shot list**: per beat, what to film. Use screen recordings of **real implemented screens** (see `docs/PROJECT_STATE.md` for what exists: Shop App sign-in and catalogue, web shop profile/catalogue, the public home page) with fictional sample data (`pnpm --filter api catalogue:seed-sample`), plus simple phone-in-hand or shop-counter b-roll. For features not built yet, use text-on-screen or a simple animated card, never a fake UI.
5. **On-screen text** per beat (≤ 7 words) and **voice-over** in English.
6. **Cover**: copy `templates/reel-cover.html` to `output/day-XX-reel/cover.html`, fill KICKER, HOOK_1 (white line), HOOK_2 (yellow line) and SUB (usually the tagline), render at `1080 1920`, and inspect it as in 4a (text must stay inside the centre 1080×1350 safe zone).

## 5. Caption (both formats)

Write `output/day-XX-<format>/caption.md`:
```
# Day XX — <theme> (<Reel | Post ×2>)
## Caption
<hook line>

<3–5 short lines>

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
2. Reply with: the files created (full paths), the winning hook, anything that needs human attention (screens to record, copy to approve), and the next `todo` day.
