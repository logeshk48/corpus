# Corpus design system — MASTER

The source of truth for every screen. Checked against the ui-ux-pro-max skill (kept in `.claude/skills/ui-ux-pro-max`,
run with `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>`).
Page-specific rules go in `pages/<page>.md` and override this file.

## Direction
Apple iOS 26 style ("Liquid Glass"): large titles, inset grouped lists, white cards on soft grey, coloured icon squares,
floating glass tab bar with a separate round Ask button. Light and dark themes; "Automatic" follows the phone.
Skill match: product type **Personal Finance Tracker** → Glassmorphism + Dark mode, minimal secondary — kept.

## Colour — Graphite + green (v2, picked with ui-ux-pro-max)
Black-and-white premium surfaces; **green / amber / red only ever mean money status** (never decoration),
so a button is never confused with good news. Tokens in `src/constants/theme.ts`, never hex in screens.
| Role | Light | Dark (pure black) |
|---|---|---|
| Background | #F4F4F1 (no pure white) | #000000 |
| Card / grouped row | #FFFFFF | #1C1C1E |
| Nested / input | #EDEDE9 | #2C2C2E |
| Separator | #E4E4DF | #38383A |
| Brand (`gold` token) | graphite #111111 | near-white #F5F5F0 |
| Text / secondary / tertiary | #111 / #5F5F5B / #6E6E69 | #FFF / #A1A1A8 / #8E8E93 |
| On track · tight · over | #0F7A45 · #A85A00 · #C8322B | #32D27A · #FFB340 · #FF6961 |
Icon squares (`Chip`) keep their colours: they identify kinds of things, not status.

## Living background (Corpus signature)
`AmbientGlow` behind Today: the glow colour IS the money status — green on track, amber tight, red over,
grey before data (`assets/images/bg/glow-*.png`). Fades as you scroll. Strength token `Corpus.glow`.

## Gen Z layer (on top of the premium base)
- **Bento tiles in pastels** (`Pastel.lilac/peach/sky/butter/mint/rose`, light + dark sets, text ≥ 4.5:1) wherever a
  set of areas is scanned at a glance — Money on Today, summaries on sub-screens. Big Inter amounts, small words.
- **Pills**: primary buttons and chips fully rounded (999); tiles 26 radius.
- **Streaks**: logging streak (`utils/streak.ts`) as a peach flame pill next to the large title (≥ 2 days).
- **Copy**: short, friendly, second person — "Money in", "Spent", "Nothing spent yet this week". No emoji as icons.
- Pastels are decoration only; money status keeps green / amber / red.
- Bento follows the skill's **Bento Box Grid**: varied sizes (wide 2×1 for Accounts + Net worth, squares between),
  tiles appear staggered 45 ms apart (skill: 30–50 ms), off with Reduce Motion.
- Skill's Gen Z style **Neubrutalism** (black outlines, hard shadows) rejected: its own rule forbids mixing flat-brutal
  with glass at random, and Corpus is glass.

## Audit rules from ui-ux-pro-max (apply on every screen)
- **Colour never alone** (High): status = colour + icon/word (bento "Check" pill, "On track" pill, ring legend).
- **No clipped essential text** (Critical): wrap to 2 lines or give a full-detail path; never ellipsize meaning.
- **Empty state = message + action** (Medium).
- **Loading keeps layout + announces busy** (High): skeletons with `accessibilityState={{ busy: true }}`.
- **Tap feedback < 100 ms**, lists of 50+ virtualised, thousand separators, tab badges sparingly.

## Type
Inter (bundled, OFL) for amounts and headings: `Font.displayBold` (amounts, large titles), `Font.display` (titles);
`tabular` digits on every amount. System font for body text. Never add fontWeight next to a custom face.
Sizes: large title 34 · section 20 · row 16 · secondary 13 · min 12.

## Components
`Group` + `GroupRow` (inset grouped list, 22 radius, hairline inset 58) · `IconChip` (rounded square, white glyph) ·
`ActivityRing` (dot ring, no SVG needed) · `GlassTabBar` (capsule + round Ask) · cards: 22–26 radius, no border.

## Rules (from the skill's pro-rules checklist)
- Touch targets ≥ 44pt iOS / 48dp Android — expand with hitSlop when the visual is smaller.
- Text contrast ≥ 4.5:1 in both themes; icons that carry meaning ≥ 3:1. No meaning by colour alone.
- Press feedback within 80–150 ms; motion off when Reduce Motion is on; one entrance moment per screen.
- Safe areas respected; scroll content padded so the floating tab bar never hides it (≥ 130 bottom).
- Glass only on navigation and controls; solid when Reduce Transparency is on.
- Icons: Ionicons only, filled for selected / outline otherwise, never emoji as icons.
- 4/8 spacing rhythm: 8 · 12 · 16 · 24 · 32.
