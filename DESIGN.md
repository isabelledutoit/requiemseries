# Requiem — Design System

The visual language of Isabelle du Toit's **Requiem** series site. Extracted from the
shipped `index.html` (the single source of truth). Note: the older
`docs/design-ideas.md` contains stale/aspirational colors — **this file reflects what
actually ships**.

Mood: **funerary · visceral · post-digital.** Dark, warm-black canvas; bone type;
blood-red and muted-gold accents; hand-drawn display font; slow, near-imperceptible motion.

---

## Palette (`:root`)

| Token | Hex | Role |
|---|---|---|
| `--bone` | `#f5f0e5` | Primary text / bright foreground |
| `--bone-dim` | `#d8cfbc` | Secondary text, nav links, descriptions |
| `--bone-faint` | `#9e9482` | Tertiary/muted text, slide dots, captions |
| `--dark` | `#15100a` | Page background |
| `--dark-mid` | `#1f1810` | Slideshow bg, image mat/letterbox, cards |
| `--brown` | `#3a2510` | Borders (stage, dividers) |
| `--brown-mid` | `#523516` | Pill / input / arrow borders |
| `--blood` | `#8a1414` | Blood-red base (rules, gradients) |
| `--blood-mid` | `#a81818` | Underline, active dot, drip |
| `--blood-bright` | `#d94a4a` | Accent labels, section labels (raised to 4.53:1 on `--dark` for AA) |
| `--gold` | `#a07d30` | Gold accent — cipher buttons, magnifier cursor, footnote glow |
| `--gold-dim` | `#6a4f1a` | Dim gold (rarely used) |

Semantic accents stay meaningful: blood = the series' emotional register; gold = the
cipher/interactive affordance; bone = voice.

---

## Typography

- **Display + body:** `'Patrick Hand', cursive` (Google Fonts) — the ONLY web font,
  used everywhere including form controls. Requires internet. Loaded via `<link
  rel="preconnect">` + the `Patrick+Hand&display=swap` stylesheet.
- Signature treatment: **uppercase + wide letter-spacing** on every label/heading.

| Element | Size | Letter-spacing | Notes |
|---|---|---|---|
| Nav brand | 1.05rem | 0.3em | uppercase |
| Nav links | 0.8rem | 0.32em | uppercase |
| Hero byline | 32px | 0.35em | uppercase, nowrap |
| Hero kicker | 0.9rem | 0.45em | uppercase, `--bone-dim` |
| Hero title (h1) | 96px | 0.25em | uppercase, line-height 1 |
| Hero sub | clamp(0.85rem,1.4vw,1rem) | 0.18em | uppercase, lh 1.75, max 70ch |
| Section label | 0.85rem | 0.5em | uppercase, `--blood-bright` |
| Slide title (h2) | clamp(1.8rem,3.5vw,3rem) | — | lh 1.15 |
| Slide desc | 1.5rem | — | lh 1.75, `--bone-dim`, max 42ch |
| Footer links | 0.95rem | 0.4em | uppercase |

---

## Layout & sections (landing)

DOM order: skip-link → fixed top nav → background canvas → hidden audio + toggle →
`main`: **hero** → **slideshow** (the 9-piece Requiem series) → **tokenizer** (with the
closing "Trojan horse" statement nested as `.tok-outro`) → **footer**. A `#lightbox`
dialog overlays for full-image viewing.

- **Nav:** fixed, transparent, `pointer-events:none` except links. Brand "Requiem"
  (left) + links (right).
- **Slideshow:** 5s autoplay (paused by default), prev/next arrows, dots, play/pause,
  ARIA carousel with a live region; images `object-fit: contain` on a `--dark-mid` mat
  (letterboxing reads as frame, not empty bars); silver frame `rgba(170,170,180,0.55)`.
- **Lightbox:** modal dialog, `inert` until opened, focus-trapped, Escape to close,
  custom zoom cursors.

---

## Signature motifs / effects

- **Canvas orb + constellation field** (`#bg-canvas`, fixed, z-0): up to
  `N = min(22, floor(w/60))` blurred orbs in a 5-color palette (2 blood, 3 silver),
  radius `5 + rand*14`, alpha `0.10 + rand*0.20`, blur `6–18px`. Drift speed `0.015`
  (very slow), **delta-time scaled** (`FRAME_REF_MS = 1000/60`, capped 3 frames) so 120Hz
  ProMotion doesn't double the rate. Orbs within `LINK_DIST = 180px` connect with faint
  silver lines (`rgba(140,140,145, (1-d/180)*0.3)`). DPR-scaled buffer capped at 2× for
  Retina. **`prefers-reduced-motion`** → single static frame, no rAF loop.
- **Bleeding blood underline:** `.hero-title::after` (48×2px bar) + `::before` (vertical
  gradient drip) animated by `@keyframes drip` (opacity + scaleY, 3s). Reused on the
  scroll hint.
- **Grain overlay:** `body::after` full-viewport inline-SVG `feTurbulence` fractal noise,
  `opacity:0.04`, `z-index:9999`, `pointer-events:none`.
- **Hidden audio easter egg:** a speaker toggle cloaked with `display:none !important`;
  plays Satie *Gymnopédie No. 1* (Wikimedia, looped, 35% volume). Silent by default.

---

## Responsive / iOS-HIG rules

- `viewport-fit=cover` + `env(safe-area-inset-*)` on skip-link, nav, hero (notch-safe).
- **`dvh`** units on hero (`100dvh`) and slide stages so the iOS URL bar can't jolt layout
  or clip copy; hero uses `min-height:100dvh` on phones.
- **44×44px tap targets** on nav links, cipher buttons, arrows, pills, inputs, lightbox
  close, footer links. Dots stay 24px (AA) and hide `<900px` where arrows carry the load.
- `object-fit: contain` on all artwork so nothing crops.
- `-webkit-tap-highlight-color: transparent` (no gray iOS flash).
- Touch adaptation via `@media (hover:none) and (pointer:coarse)`: zoom badge stays
  visible + pulses; slideshow stacks to a column.
- Full a11y scaffold: skip link, `main` landmark, `:focus-visible` outline (3px `--bone`),
  `.sr-only`, live regions, keyboard-operable controls, lightbox focus management.

---

## Applying this to Phase 3 (Portfolio)

The new Portfolio reuses this exact language — palette, Patrick Hand uppercase labels,
`--dark` canvas, orb background, `object-fit: contain` on `--dark-mid` mats, the blood
`.footer-rule` gradient as the **divider between artwork blocks**, and the same
slideshow + lightbox mechanics — but **cipher-free** (no token numbers, concept words, or
embeddings). Each artwork block presents its images larger (~80vh stage). The Requiem
landing keeps everything above, with its slide stage enlarged to ~80dvh to match.
