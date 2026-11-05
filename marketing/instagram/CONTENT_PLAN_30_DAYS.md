# Instagram — 30-day "coming soon" plan

**Owner:** product owner · **Created:** 2026-11-05 · **Page:** [@zero.byt](https://www.instagram.com/zero.byt/) · settings in `brand.json`

Rule per day: **Reel day = 1 reel. Post day = 2 posters** (two separate posts, or one 2-slide carousel).
Generate any day with `/instagram reel <day>` or `/instagram post <day>`. Output lands in `output/day-XX-<format>/`.

## Content rules (apply to every day)

- Say only what `docs/FEATURE_CATALOG.md` marks Confirmed, Confirmed direction or Implemented. Everything is phrased as **coming soon**.
- The software has **no public name yet**: never invent one. Call it "a new app for paint shops" and credit it only as **Powered by zero.byt** (logo on every poster/cover, `Powered by @zero.byt` in every caption).
- Never state prices, plans, launch dates, user/shop counts, GST/invoice rules, delivery, online payment, or "free".
- Credit is always "approved by **your** shop" — never automatic, never a score.
- Each shop's data is private to that shop — never imply shops see each other's customers, prices or credit.
- English headline + one short Malayalam line. Malayalam must be reviewed by a native speaker before posting.
- Screens shown in reels must be real, implemented screens with fictional sample data (`catalogue:seed-sample`), never real customer data.

## Calendar

Pillars: **T** teaser/problem · **S** shops · **P** painters · **C** customers · **B** trust/brand

| Day | Format | Pillar | Theme | Hook / poster ideas | Key message | Source | Status |
|---:|---|---|---|---|---|---|---|
| 1 | Post ×2 | T | Teaser | A: "Something new for Kerala paint shops" · B: "For shops, painters and homes" | A platform is coming | PRODUCT_OVERVIEW §1 | ready |
| 2 | Reel | T | Counter chaos | "Still taking paint orders on WhatsApp?" | Orders, offers and bills in one place | PRODUCT_OVERVIEW §2 | todo |
| 3 | Post ×2 | T | Who it's for | A: "Two apps + one web portal" · B: "Shop owner? Painter? Painting your home?" | Customer App, Shop App, web portal | PRODUCT_OVERVIEW §3 | todo |
| 4 | Reel | T | Painter pain | "One site. Three shops. How much did it cost?" | Site-wise spend across shops | FEATURE_CATALOG §2 | todo |
| 5 | Post ×2 | T | The notebook | A: "Pending payments in a notebook?" · B: "See every bill and what's still due" | Running bills, payments, outstanding | PRODUCT_OVERVIEW §7 | todo |
| 6 | Post ×2 | B | Vision | A: "Every local shop deserves its own app" · B: "No app to build. Just join." | One shared app for all shops | PRODUCT_OVERVIEW §1, §3.2 | todo |
| 7 | Reel | T | First look | "First look 👀" — quick cuts of real Shop App screens | It's real and being built | SHP-005 | todo |
| 8 | Post ×2 | S | Your storefront | A: "Your shop, on every customer's phone" · B: "4 steps to go live: photo, address, support number, 10 products" | Onboarding checklist, then review | SHP-003, PLT-002 | todo |
| 9 | Reel | S | Shop App catalogue | "Change a price from your phone" | Prices, pack sizes, availability on the Shop App | SHP-005 | todo |
| 10 | Post ×2 | S | Brand catalogue | A: "Brand catalogues, ready to use" · B: "Shade codes, favourite shades, your own shades" | Platform brand catalogue + shades | CAT-001, CAT-002 | todo |
| 11 | Post ×2 | S | Packs & stock | A: "A price for every pack size" · B: "Out of stock? One tap." | Pack prices and availability | CAT-002 | todo |
| 12 | Reel | S | Register your shop | "How a shop goes live" — register → set up → review → Live | Self-registration and review | SHP-001, PLT-002 | todo |
| 13 | Post ×2 | S | Staff | A: "Staff accounts with roles" · B: "Owner reports stay with the owner" | Role-based access | FEATURE_CATALOG §3 | todo |
| 14 | Post ×2 | S | Offers & rewards | A: "Run your own offers" · B: "Reward points for app orders" | Shop-set offers and points | FEATURE_CATALOG §1, §4 | todo |
| 15 | Reel | P | Work sites | "Painters: meet your site list" — create "Green Villa", link an order | Multiple work sites | FEATURE_CATALOG §2 | todo |
| 16 | Post ×2 | P | Site spend | A: "One site total, across every shop" · B: "Each shop's bill stays separate" | Combined spend + shop-wise bills | PRODUCT_OVERVIEW §7 | todo |
| 17 | Post ×2 | P | Credit | A: "Credit, decided by your shop" · B: "Your shop sets the limit and terms" | Shop-specific credit, no auto score | PRODUCT_OVERVIEW §8 | todo |
| 18 | Reel | P | A painter's day | "POV: ordering paint from the site" | Order from site, linked to the site | FEATURE_CATALOG §2 | todo |
| 19 | Post ×2 | P | Bills | A: "Running bill → final bill" · B: "Payments recorded, balance clear" | Running/final bills, offline payments | PRODUCT_OVERVIEW §7 | todo |
| 20 | Post ×2 | B | Myth vs fact | A: "Will other shops see my credit? No." · B: "Will other shops see my prices? No." | Tenant isolation | PRODUCT_OVERVIEW §1, §8 | todo |
| 21 | Reel | P | Before / after | "Painter's notebook vs painter's app" | Sites, bills, dues in one view | PRODUCT_OVERVIEW §4 | todo |
| 22 | Post ×2 | C | Home customers | A: "Painting your home? Keep it simple" · B: "Pick by brand, pack size and shade" | Simple shopping flow | PRODUCT_OVERVIEW §4 | todo |
| 23 | Reel | C | Find shops | "Find paint shops near you" — nearest first, or pick a district | Discover shops, My Shops | D-037, D-038 | todo |
| 24 | Post ×2 | C | Search | A: "Your shop first, then others" · B: "One shop per cart — no mix-ups" | Cross-shop search rules | PRODUCT_OVERVIEW §5 | todo |
| 25 | Post ×2 | C | Reward points | A: "Earn points on app orders" · B: "Use them on eligible bills" (rules set by each shop) | Reward points | PRODUCT_OVERVIEW §9 | todo |
| 26 | Reel | C | Bills for everyone | "Where did my paint money go?" | Shop-wise orders and bills | FEATURE_CATALOG §1 | todo |
| 27 | Post ×2 | B | Trust | A: "Each shop's data stays with that shop" · B: "Your mobile number is your login" | Isolation, OTP sign-in | DATA_AND_SECURITY, D-021 | todo |
| 28 | Reel | B | Behind the scenes | "We're building this for Kerala" — screens, code, sketches | Made for local shops | PROJECT_STATE | todo |
| 29 | Post ×2 | B | Recap | A: "Everything coming, in one picture" · B: "Shops ✓ Painters ✓ Customers ✓" | Full recap | FEATURE_CATALOG | todo |
| 30 | Reel | B | Coming soon | "Coming soon. Be first." — shops DM to join early | Follow @zero.byt + early-shop CTA | brand.json cta | todo |

Totals: 12 reel days, 18 post days (36 posters).

## Status values

`todo` → `ready` (generated, waiting for review) → `posted` (set by hand after publishing, with the date).

## Posting checklist (by hand)

1. Read the caption and Malayalam line; fix anything that sounds off.
2. Check every claim against the content rules above.
3. Post; set the row to `posted (YYYY-MM-DD)`.
