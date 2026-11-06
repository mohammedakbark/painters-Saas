# Day 02: Reel · POV · painters ordering from the site

**Approved look:** `frame-order.png` (the 11–15 s beat, approved by the product owner on 2026-11-06). Build every app beat in this style: teal A background with rings, a coral "POV" tag, a top progress bar (5 segments), a big white + yellow two-line caption, a cream animated card, a subtitle bar, and the Powered by zero.byt lockup.

## Production (2026-11-06)

The product owner chose a **fully animated** video, made by Claude. The b-roll scenes in the beat sheet below (ladder, bucket, phone) are illustrated animations instead of filmed footage. The S2 caption is "Call the shop? No reply?".

Output: `day-02-reel.mp4` (27.5 s, re-timed to the voice). Source: `reel.html`. Voice-over: AI voice (en-IN Prabhat, product owner's choice), see `voiceover.txt`. Scene times: 0–3.4, 3.4–7.6, 7.6–10.4, 10.4–14.0, 14.0–19.6 and 19.6–27.5 s. The end card has two lines: the CTA, then the tagline.

## Hooks

| Hook | Specific | Audience | Curiosity | Truth | Total |
|---|---|---|---|---|---|
| **"POV: you need 2 more buckets at the site"** ✅ | 5 | 5 | 4 | 5 | **19** |
| "Painters: still calling the shop from the ladder?" | 4 | 5 | 4 | 4 | 17 |
| "One site. Three shops. Who owes what?" | 4 | 4 | 5 | 5 | 18 (kept for Day 4) |

## Spec

- 21 seconds, 1080×1920 (9:16), on-screen captions always visible (most people watch muted).
- Keep text between 250 px from the top and 400 px from the bottom, so Instagram's own UI doesn't cover it.
- Audio: upbeat, light and modern; a soft "pop" on each card entrance and a "tap" click on the Order button. Use a track from Instagram's audio library; no copyrighted file is baked in.
- Fonts: Poppins 900 for captions, Inter for subtitles and UI. Colours from style A only.

## Beat sheet

| Time | Visual | On-screen text | Voice-over (English) |
|---|---|---|---|
| 0–3 s | **B-roll:** a painter on a ladder, the wall half painted, and a close-up of an empty bucket | **POV: 2 more buckets needed** | "Halfway through the wall… and the paint's gone." |
| 3–7 s | **B-roll:** a phone in hand, a call ringing out, then an unanswered chat bubble | **Call the shop? Wait for a reply?** | "Call the shop. Wait. Call again?" |
| 7–11 s | **Animated card:** a list of sites slides up (Green Villa, Lake View Flat, Hill Top House); a finger taps **Green Villa** | **Open your site** | "Open your site." |
| 11–15 s | **Animated card** (`frame-order.png`): Sree Colours · Monsoon Shield Emulsion · Kerala Teal AP 4021 · 4L × 2 → tap **Order**, then "✓ Added to Green Villa" pops in | **Order from your shop** | "Order from your shop, right from the site." |
| 15–18 s | **Animated card:** the Green Villa total counts up, with bill rows "Sree Colours" and "Varma Paints" shown separately | **Every shop. One site total.** | "Every order adds up under that site, with each shop's bill kept separate." |
| 18–21 s | **End card:** the reel-cover style, "Painters, this is coming." + tagline + lockup | **Tag a painter friend** | "Shop. Painter. Customer. Connected." |

## Shot list

1. **Ladder shot (0–3 s):** film at a real or staged painting site, vertical. Show no faces or brand labels, or only with consent.
2. **Empty bucket close-up:** a plain, unbranded bucket.
3. **Phone in hand (3–7 s):** show the screen blurred or a generic "Calling…" screen. Never use a real contact or number.
4. **App beats (7–18 s):** these are **motion-graphics cards, not a screen recording**. The customer app isn't built yet, so never present a fake UI as the real app. Build them from `frame-order.html`: duplicate it per beat and animate in CapCut or Canva (slide-up 250 ms, tap ripple, number count-up).
5. **End card (18–21 s):** `cover.png` style with the CTA line.

## Facts and sources

- Painters manage multiple work sites and attach orders to a site: `docs/FEATURE_CATALOG.md` §2
- Combined spend per site across shops, with each shop's bill separate: `docs/PRODUCT_OVERVIEW.md` §7
- An order belongs to one shop: `docs/PRODUCT_OVERVIEW.md` §5, §7

All shop, site, brand, shade and amount data is fictional.
