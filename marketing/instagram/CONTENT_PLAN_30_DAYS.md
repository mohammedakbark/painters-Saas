# Instagram: 30-day launch plan for @zero.byt

**Owner:** product owner · **Created:** 2026-11-05 · **Revised:** 2026-11-05 (format variety) · **Page:** [@zero.byt](https://www.instagram.com/zero.byt/) · settings in `brand.json`

**Rhythm:** a reel day has 1 reel and a post day has 2 posters (two posts, or one 2-slide carousel). **Day 1 is a single poster.** There are 10 reel days and 20 post days.

**Tagline (D-040, switched 2026-11-06):** "Shop. Painter. Customer. Connected."

**Product name is secret:** the product is named SevenPalette (D-040), but the product owner wants it kept secret in posts until the **Day 30 reveal**. Until then: no name and no fan logo, only "the app" and Powered by zero.byt.

**Goal (product owner, 2026-11-05):** don't repeat one pattern, and don't say "Coming soon" every day. Get people engaged by showing what the software actually does: features, how it works, questions, tips and sneak peeks.

## Visual families

Approved by the product owner on 2026-11-05: **A** first, then **D**, then **C**. B was rejected. Palettes are in `brand.json` → `styles`.

- **A, teal / sun / coral:** the main family. It has a cream (light) variant and a warm coral/sun variant.
- **D, near-black / lime / paint gradient:** teasers, myths and sneak peeks.
- **C, violet / lime:** comparisons.

## Format library

Templates are in `.claude/skills/instagram/templates/`.

| ID | Format | Family | Badge | Template |
|---|---|---|---|---|
| F1 | Showcase: tilted phone + 3 floating cards | A teal | NEW FOR SHOPS / COMING SOON | `style-a-showcase.html` |
| F2 | Feature spotlight: phone with numbered callouts | A teal | FEATURE SPOTLIGHT | `format-f2-spotlight.html` |
| F3 | How it works: 3 numbered steps | A cream | HOW IT WORKS | `format-f3-steps.html` |
| F4 | Question / poll: "Comment 1, 2 or 3" | A warm | YOUR TURN | `format-f4-poll.html` |
| F5 | This or that: old way vs app way | C | THIS OR THAT | `format-f5-this-or-that.html` |
| F6 | Myth vs fact | D | MYTH VS FACT | `format-f6-myth-fact.html` |
| F7 | Tip card: Shop tip / Painter tip #n | A cream/sun | SHOP TIP / PAINTER TIP | `format-f7-tip.html` |
| F8 | Sneak peek: spotlit close-up of a screen | D | SNEAK PEEK | `format-f8-sneak-peek.html` |
| F9 | Problem → solution: before mess vs clean phone | C | BEFORE / AFTER | `style-c-before-after.html` |
| F10 | Big-type teaser | D | COMING SOON / ALMOST HERE | `style-d-typography.html` |

**Reel types:** POV, before/after, 3-step demo, quiz, behind the build, recap. The cover always uses `reel-cover.html`.

## Content rules (apply to every day)

**What we say**
- Only features that `docs/FEATURE_CATALOG.md` marks Confirmed, Confirmed direction or Implemented. Future features are described as coming, never as available now.
- **"Coming soon" appears as a badge only on Days 1, 7, 22, 28 and 30.** Other days use their format's badge and an engagement CTA.
- **No product name before Day 30.** Call it "the app" or "a new app for paint shops". Day 30 reveals **SevenPalette** and its fan logo. Credit it only as **Powered by zero.byt**: the logo lockup goes on every poster and cover, and `Powered by @zero.byt` ends every caption.
- **English only.**

**What we never say**
- Prices, plans, launch dates or countdown numbers, user or shop counts, statistics, testimonials, GST/invoice rules, delivery, online payment, or "free".
- "Stock". Say "availability" instead.
- "Built in Kerala". Say "Made for Kerala".

**Credit and privacy**
- Credit is always "approved by **your** shop". It is never automatic and never a score.
- Each shop's data is private to that shop.

**Formats and visuals**
- Tips must be genuine, practical advice, with no invented numbers.
- No format appears on two post days in a row. The only exception is F10 on the finale days.
- Phone screens are designed mockups with fictional data: "Sree Colours, Thrissur", "Varma Paints, Kochi", "Green Villa", "Rajesh", "Aurora Paints", "Kerala Teal AP 4021".

## Calendar

Pillars: **T** teaser · **S** shops · **P** painters · **C** customers · **B** trust/brand. The Format column gives poster A + poster B.

| Day | Format | Pillar | Topic | Headline / hook | Engagement CTA | Source | Status |
|---:|---|---|---|---|---|---|---|
| 1 | Post ×1: F1 | T | The big idea | "Your paint shop. Every phone." (COMING SOON) | Follow @zero.byt | PRODUCT_OVERVIEW §1, §3 | ready |
| 2 | Reel: POV | P | Order from the site | "POV: you need 2 more buckets at the site" | Tag a painter friend | FEATURE_CATALOG §2 | ready |
| 3 | Post: F2 + F4 | S | Storefront · counter pain | A: "Your catalogue, on every customer's phone." · B: "What slows your shop counter the most?" | Save this · Comment 1, 2 or 3 | PRODUCT_OVERVIEW §3.1, §6 | ready |
| 4 | Reel: before/after | P | Notebook vs site bills | "Notebook vs app. Same painter, same site." | Share with a painter | PRODUCT_OVERVIEW §7 | todo |
| 5 | Post: F3 + F7 | S | Go live · shade codes | A: "How a shop goes live" · B: "Shop tip #1: Write the shade code on every order." | DM to join early · Save this tip | SHP-001, SHP-003, PLT-002, CAT-002 | ready |
| 6 | Post: F6 + F5 | B | Privacy · running bill | A: Myth "Other shops will see my prices" → Fact · B: "Notebook dues or a clear running bill?" | Comment ✍️ or 📱 | PRODUCT_OVERVIEW §1, §7 | ready |
| 7 | Post: F10 + F8 | T | Teaser · peek | A: "Paint shops, get ready." (COMING SOON) · B: "What do you think this screen does?" | Guess in the comments | FEATURE_CATALOG §2 | ready |
| 8 | Reel: quiz | S | Shade codes | "Same name, two shades. Which one did the customer want?" | Comment A or B | CAT-001, CAT-002 | todo |
| 9 | Post: F2 + F7 | S/P | Shades & favourites · painter tip | A: "Every shade, with its code." · B: "Painter tip #1: Keep one list per work site." | Save · Tag a painter | CAT-002 (D-030), FEATURE_CATALOG §2 | todo |
| 10 | Post: F4 + F3 | P | Painters' shops · site tracking | A: "Painters: how many shops do you buy from for one site?" (1 / 2 / 3+) · B: "How a painter tracks a site" | Comment 1, 2 or 3+ | FEATURE_CATALOG §2 | todo |
| 11 | Reel: 3-step demo | S | Shop App on the phone | "Change a price from your phone in 3 taps" | Save this | SHP-005 | todo |
| 12 | Post: F9 + F6 | P/B | Bills · credit | A: "From notebook to one app." · B: Myth "An app decides my credit" → Fact "Your shop decides." | Share with a shop owner | PRODUCT_OVERVIEW §7, §8 | todo |
| 13 | Post: F8 + F2 | P | Site spend | A: sneak peek, site total card · B: "One site. Every shop. One total." | Guess · Save | FEATURE_CATALOG §2 | todo |
| 14 | Reel: behind the build | B | Made for Kerala | "We're building this for Kerala's paint counters" | Follow for more | PROJECT_STATE | todo |
| 15 | Post: F7 + F4 | S | Availability · wishlist | A: "Shop tip #2: Keep availability updated, not the phone ringing." · B: "Which would help you most? Running bill / Credit tracking / Reward points" | Save · Comment 1, 2 or 3 | CAT-002, PRODUCT_OVERVIEW §7–9 | todo |
| 16 | Post: F2 + F5 | P/S | Running → final bill | A: "Running bill → final bill." · B: "Call the shop or check the app?" | Comment 📞 or 📱 | PRODUCT_OVERVIEW §7 | todo |
| 17 | Reel: POV | C | Home customer | "Painting your home? Pick brand, pack, shade. Done." | Share with family | PRODUCT_OVERVIEW §4 | todo |
| 18 | Post: F3 + F8 | C | Customer order · find shops | A: "How a customer orders" (find shop → pick → one shop per cart) · B: sneak peek, find shops nearby | Guess · Save | PRODUCT_OVERVIEW §5, D-037, D-038 | todo |
| 19 | Post: F6 + F7 | P | Painter-only info | A: Myth "Everyone sees painter offers" → Fact "Only painters the shop confirms." · B: "Painter tip #2: Ask your shop to confirm you as their painter." | Tag a painter | D-036, PRODUCT_OVERVIEW §4 | todo |
| 20 | Reel: quiz | B | Who is it for? | "Shop owner, painter or home customer? Which feature is yours?" | Comment your role | PRODUCT_OVERVIEW §3 | todo |
| 21 | Post: F4 + F2 | C/B | What next · rewards | A: "What should we show you next?" (Shop App / Painter sites / Customer app) · B: "Earn points on app orders." | Comment 1, 2 or 3 | PRODUCT_OVERVIEW §9 | todo |
| 22 | Post: F10 + F9 | T/C | Teaser · customer before/after | A: "Your counter, upgraded." (COMING SOON) · B: "Call five shops, or check one app?" | Share | PRODUCT_OVERVIEW §5 | todo |
| 23 | Reel: 3-step demo | S | Staff roles | "Owner sees reports. Staff see orders." | Save | FEATURE_CATALOG §3 | todo |
| 24 | Post: F5 + F3 | P/S | Bills · credit | A: "Paper bill or shop-wise bills on your phone?" · B: "How shop credit works" (request → your shop approves & sets the limit → track dues) | Comment ✍️ or 📱 | PRODUCT_OVERVIEW §7, §8 | todo |
| 25 | Post: F7 + F8 | S | Favourite shades · Shop App peek | A: "Shop tip #3: Save your shop's favourite shades." · B: sneak peek, Shop App catalogue | Save · Guess | CAT-002, SHP-005 | todo |
| 26 | Reel: before/after | S | A day at the counter | "A paint shop's day: before vs after" | Share with a shop owner | PRODUCT_OVERVIEW §2 | todo |
| 27 | Post: F6 + F2 | S/C | Easy onboarding · My Shops | A: Myth "Going digital needs a big setup" → Fact "Register, add the basics, go live after review." · B: "Your shops, your list." (My Shops, active shop first) | Save | SHP-003, PLT-002, D-037 | todo |
| 28 | Post: F10 + F4 | T | Almost here | A: "Almost here." (COMING SOON) · B: "Which feature are you waiting for?" | Comment | FEATURE_CATALOG | todo |
| 29 | Reel: recap | B | 30 days in 30 seconds | "Everything we showed you, in 30 seconds" | Save + share | FEATURE_CATALOG | todo |
| 30 | Post: F10 + F1 | T | Name reveal · be first | A: "Meet SevenPalette." (COMING SOON, reveal the name and fan logo) · B: "Shop owners: join early." | DM @zero.byt to join early | brand.json cta | todo |

## Status values

`todo` → `ready` (generated, waiting for review) → `posted` (set by hand after publishing, with the date).

## Posting checklist (by hand)

1. Read the caption; fix anything that sounds off.
2. Check every claim against the content rules above.
3. Post; set the row to `posted (YYYY-MM-DD)`.
